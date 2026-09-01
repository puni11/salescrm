const LEAD_ASSIGNMENT_START_DATE = new Date(
  "2026-08-31T00:00:00.000Z"
);

const MAX_NEW_LEADS = 3;


export async function getLeadAssignment(
  leadDb,
  counsellorDb,
  courseName
) {
  try {
    // --------------------------------------------
    // VALIDATE COURSE
    // --------------------------------------------

    if (
      !courseName ||
      typeof courseName !== "string" ||
      !courseName.trim()
    ) {
      return null;
    }


    // --------------------------------------------
    // COLLECTIONS
    // --------------------------------------------

    const leadsCollection =
      leadDb.collection("dm");

    const counsellorsCollection =
      counsellorDb.collection("users");

    const coursesCollection =
      leadDb.collection("courses");

    const assignmentStateCollection =
      leadDb.collection("lead_assignment_state");


    // --------------------------------------------
    // FIND COURSE
    // --------------------------------------------

    const courseDocument =
      await coursesCollection.findOne({
        name: {
          $regex: new RegExp(
            `^${escapeRegex(courseName.trim())}$`,
            "i"
          ),
        },
      });


    // --------------------------------------------
    // SPECIAL COUNSELLOR
    // --------------------------------------------
    //
    // Special counsellor:
    //
    // - Course must be assigned to them
    // - Must not be blocked
    // - Offline status is ignored
    //

    if (courseDocument) {
      const specialCounsellor =
        await counsellorsCollection.findOne({
          role: "counsellor",

          counsellorStatus: "special",

          isBlocked: {
            $ne: true,
          },

          specialCourses:
            courseDocument._id,
        });


      if (specialCounsellor) {
        return {
          _id: specialCounsellor._id,
          name: specialCounsellor.name,
        };
      }
    }


    // --------------------------------------------
    // GET AVAILABLE REGULAR COUNSELLORS
    // --------------------------------------------

    const regularCounsellors =
      await counsellorsCollection
        .find({
          role: "counsellor",

          // Blocked counsellors never get leads
          isBlocked: {
            $ne: true,
          },

          // Offline logic applies ONLY to regular
          availabilityStatus: {
            $ne: "offline",
          },

          $or: [
            {
              counsellorStatus: "regular",
            },

            // Old users without status = regular
            {
              counsellorStatus: {
                $exists: false,
              },
            },
          ],
        })
        .sort({
          _id: 1,
        })
        .toArray();


    if (regularCounsellors.length === 0) {
      return null;
    }


    // --------------------------------------------
    // GET REGULAR COUNSELLOR IDS
    // --------------------------------------------

    const regularCounsellorIds =
      regularCounsellors.map(
        (counsellor) => counsellor._id
      );


    // --------------------------------------------
    // COUNT CURRENT NEW LEADS
    // --------------------------------------------
    //
    // Old leads before START_DATE are ignored
    //

    const leadCounts =
      await leadsCollection
        .aggregate([
          {
            $match: {
              status: "New Lead",

              createdAt: {
                $gte:
                  LEAD_ASSIGNMENT_START_DATE,
              },

              "assignedTo._id": {
                $in:
                  regularCounsellorIds,
              },
            },
          },

          {
            $group: {
              _id: "$assignedTo._id",

              count: {
                $sum: 1,
              },
            },
          },
        ])
        .toArray();


    // --------------------------------------------
    // CREATE LEAD COUNT MAP
    // --------------------------------------------

    const leadCountMap =
      new Map(
        leadCounts.map(
          (item) => [
            item._id.toString(),
            item.count,
          ]
        )
      );


    // --------------------------------------------
    // COUNSELLORS WITH LESS THAN 6 LEADS
    // --------------------------------------------

    let eligibleCounsellors =
      regularCounsellors.filter(
        (counsellor) => {
          const currentLeadCount =
            leadCountMap.get(
              counsellor._id.toString()
            ) || 0;

          return (
            currentLeadCount <
            MAX_NEW_LEADS
          );
        }
      );


    // --------------------------------------------
    // IF EVERYONE HAS 6 LEADS
    // --------------------------------------------
    //
    // Start round robin again among all available
    // regular counsellors.
    //

    if (eligibleCounsellors.length === 0) {
      eligibleCounsellors =
        regularCounsellors;
    }


    // --------------------------------------------
    // GET PERSISTENT ROUND ROBIN STATE
    // --------------------------------------------

    const assignmentState =
      await assignmentStateCollection.findOne({
        _id: "regular_round_robin",
      });


    const lastCounsellorId =
      assignmentState?.lastCounsellorId
        ? assignmentState.lastCounsellorId.toString()
        : null;


    // --------------------------------------------
    // FIND LAST COUNSELLOR POSITION
    // --------------------------------------------

    let lastIndex = -1;


    if (lastCounsellorId) {
      lastIndex =
        regularCounsellors.findIndex(
          (counsellor) =>
            counsellor._id.toString() ===
            lastCounsellorId
        );
    }


    // --------------------------------------------
    // STRICT ROUND ROBIN
    // --------------------------------------------
    //
    // Always start searching AFTER the
    // last assigned counsellor.
    //

    let selectedCounsellor = null;


    for (
      let i = 1;
      i <= regularCounsellors.length;
      i++
    ) {
      const index =
        (lastIndex + i) %
        regularCounsellors.length;


      const counsellor =
        regularCounsellors[index];


      const isEligible =
        eligibleCounsellors.some(
          (eligibleCounsellor) =>
            eligibleCounsellor._id
              .toString() ===
            counsellor._id.toString()
        );


      if (isEligible) {
        selectedCounsellor =
          counsellor;

        break;
      }
    }


    // --------------------------------------------
    // SAFETY CHECK
    // --------------------------------------------

    if (!selectedCounsellor) {
      return null;
    }


    // --------------------------------------------
    // SAVE ROUND ROBIN POSITION
    // --------------------------------------------

    await assignmentStateCollection.updateOne(
      {
        _id: "regular_round_robin",
      },

      {
        $set: {
          lastCounsellorId:
            selectedCounsellor._id,

          updatedAt:
            new Date(),
        },

        $setOnInsert: {
          createdAt:
            new Date(),
        },
      },

      {
        upsert: true,
      }
    );


    // --------------------------------------------
    // RETURN COUNSELLOR
    // --------------------------------------------

    return {
      _id:
        selectedCounsellor._id,

      name:
        selectedCounsellor.name,
    };

  } catch (error) {
    console.error(
      "Lead assignment error:",
      error
    );

    return null;
  }
}


// --------------------------------------------
// ESCAPE REGEX
// --------------------------------------------

function escapeRegex(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}