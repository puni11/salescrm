  import { ObjectId } from "mongodb";

  const LEAD_ASSIGNMENT_START_DATE = new Date(
    "2026-08-31T00:00:00.000Z"
  );

  const MAX_NEW_LEADS = 3;

  // =====================================================
  // MLOPS CONFIG
  // =====================================================

  const MLOPS_COURSE_ID = "6a9aee153af0d1b192a55569";

  const DEEPANSHU_ID = "6a4507369c0b2c7d69a99ab9";
const DEEPANSHU_COURSE_ID = "6aa23de832cc49026d2e5833";


  // =====================================================
  // MAIN FUNCTION
  // =====================================================

  export async function getLeadAssignment(
    leadDb,
    counsellorDb,
    courseName
  ) {
    try {
      // =================================================
      // VALIDATE COURSE
      // =================================================

      if (
        !courseName ||
        typeof courseName !== "string" ||
        !courseName.trim()
      ) {
        console.log(
          "Lead assignment: Invalid course name"
        );

        return null;
      }


      // =================================================
      // COLLECTIONS
      // =================================================

      const leadsCollection =
        leadDb.collection("dm");

      const counsellorsCollection =
        counsellorDb.collection("users");

      const coursesCollection =
        leadDb.collection("courses");

      const assignmentStateCollection =
        leadDb.collection(
          "lead_assignment_state"
        );


      // =================================================
      // FIND COURSE
      // =================================================

      const courseDocument =
        await coursesCollection.findOne({
          name: {
            $regex: new RegExp(
              `^${escapeRegex(
                courseName.trim()
              )}$`,
              "i"
            ),
          },
        });


      if (!courseDocument) {
        console.log(
          "Lead assignment: Course not found:",
          courseName
        );

        return null;
      }


      // =================================================
      // CHECK MLOPS
      // =================================================

      const courseId = courseDocument._id.toString();
const isMLOps =
  courseId === MLOPS_COURSE_ID ||
  courseId === DEEPANSHU_COURSE_ID;


      console.log(
        "Lead Assignment:",
        {
          courseName,
          courseId:
            courseDocument._id.toString(),
          isMLOps,
        }
      );


      // =================================================
      // MLOPS ASSIGNMENT
      // =================================================

      if (isMLOps) {
        return await assignMLOpsLead({
          leadsCollection,
          counsellorsCollection,
          assignmentStateCollection,
        });
      }


      // =================================================
      // NORMAL SPECIAL COUNSELLOR
      // =================================================

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
        console.log(
          "Special course assigned to:",
          specialCounsellor.name
        );

        return {
          _id:
            specialCounsellor._id,

          name:
            specialCounsellor.name,
        };
      }


      // =================================================
      // NORMAL REGULAR ASSIGNMENT
      // =================================================

      return await assignRegularLead({
        leadsCollection,
        counsellorsCollection,
        assignmentStateCollection,
      });

    } catch (error) {
      console.error(
        "Lead assignment error:",
        error
      );

      return null;
    }
  }


  // =====================================================
  // MLOPS ASSIGNMENT
  // =====================================================

  async function assignMLOpsLead({
    leadsCollection,
    counsellorsCollection,
    assignmentStateCollection,
  }) {

    console.log(
      "========== MLOPS ASSIGNMENT =========="
    );


    // ===================================================
    // GET REGULAR COUNSELLORS
    // ===================================================

    const regularCounsellors =
      await counsellorsCollection
        .find({
          role: "counsellor",

          // Blocked never gets leads
          isBlocked: {
            $ne: true,
          },

          // Offline never gets leads
          availabilityStatus: {
            $ne: "offline",
          },

          // Regular counsellors
          $or: [
            {
              counsellorStatus:
                "regular",
            },
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


    // ===================================================
    // GET DEEPANSHU
    // ===================================================

    const deepanshu =
      await counsellorsCollection.findOne({
        _id: new ObjectId(
          DEEPANSHU_ID
        ),

        role: "counsellor",

        // Blocked excluded
        isBlocked: {
          $ne: true,
        },

        // Offline excluded
        availabilityStatus: {
          $ne: "offline",
        },
      });


    // ===================================================
    // BUILD MLOPS POOL
    // ===================================================

    const mlopsCounsellors = [
      ...(deepanshu
        ? [deepanshu]
        : []),

      ...regularCounsellors,
    ];


    // ===================================================
    // REMOVE DUPLICATES
    // ===================================================

    const uniqueCounsellors =
      Array.from(
        new Map(
          mlopsCounsellors.map(
            (counsellor) => [
              counsellor._id.toString(),
              counsellor,
            ]
          )
        ).values()
      );


    // ===================================================
    // NO COUNSELLORS
    // ===================================================

    if (
      uniqueCounsellors.length === 0
    ) {
      console.log(
        "MLOps: No available counsellors"
      );

      return null;
    }


    // ===================================================
    // GET COUNSELLOR IDS
    // ===================================================

    const counsellorIds =
      uniqueCounsellors.map(
        (counsellor) =>
          counsellor._id
      );


    // ===================================================
    // COUNT CURRENT NEW LEADS
    // ===================================================

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
                  counsellorIds,
              },
            },
          },

          {
            $group: {
              _id:
                "$assignedTo._id",

              count: {
                $sum: 1,
              },
            },
          },
        ])
        .toArray();


    // ===================================================
    // CREATE COUNT MAP
    // ===================================================

    const leadCountMap =
      new Map(
        leadCounts.map(
          (item) => [
            item._id.toString(),
            item.count,
          ]
        )
      );


    // ===================================================
    // PRINT CURRENT COUNTS
    // ===================================================

    console.log(
      "MLOps Counsellor Counts:",
      uniqueCounsellors.map(
        (counsellor) => ({
          name:
            counsellor.name,

          id:
            counsellor._id.toString(),

          status:
            counsellor.counsellorStatus,

          availability:
            counsellor.availabilityStatus,

          blocked:
            counsellor.isBlocked,

          newLeads:
            leadCountMap.get(
              counsellor._id.toString()
            ) || 0,
        })
      )
    );


    // ===================================================
    // FIRST TRY:
    // COUNSELLORS BELOW MAX
    // ===================================================

    let eligibleCounsellors =
      uniqueCounsellors.filter(
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


    // ===================================================
    // FALLBACK:
    // EVERYONE HAS MAX
    //
    // IMPORTANT:
    // We DO NOT stop assignment.
    //
    // We use everyone who is:
    // - not blocked
    // - not offline
    //
    // ===================================================

    if (
      eligibleCounsellors.length === 0
    ) {

      console.log(
        "MLOps: Everyone reached MAX_NEW_LEADS."
      );

      console.log(
        "MLOps: Falling back to normal round robin."
      );

      eligibleCounsellors =
        uniqueCounsellors;
    }


    // ===================================================
    // GET MLOPS ROUND ROBIN STATE
    // ===================================================

    const assignmentState =
      await assignmentStateCollection.findOne({
        _id: "mlops_round_robin",
      });


    const lastCounsellorId =
      assignmentState?.lastCounsellorId
        ? assignmentState.lastCounsellorId.toString()
        : null;


    // ===================================================
    // FIND LAST COUNSELLOR INDEX
    // ===================================================

    let lastIndex = -1;


    if (lastCounsellorId) {

      lastIndex =
        uniqueCounsellors.findIndex(
          (counsellor) =>
            counsellor._id.toString() ===
            lastCounsellorId
        );
    }


    // ===================================================
    // ROUND ROBIN
    // ===================================================

    let selectedCounsellor =
      null;


    for (
      let i = 1;
      i <= uniqueCounsellors.length;
      i++
    ) {

      const index =
        (lastIndex + i) %
        uniqueCounsellors.length;


      const counsellor =
        uniqueCounsellors[index];


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


    // ===================================================
    // SAFETY CHECK
    // ===================================================

    if (!selectedCounsellor) {

      console.log(
        "MLOps: Could not select counsellor"
      );

      return null;
    }


    // ===================================================
    // SAVE MLOPS ROUND ROBIN STATE
    // ===================================================

    await assignmentStateCollection.updateOne(
      {
        _id: "mlops_round_robin",
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


    // ===================================================
    // LOG ASSIGNMENT
    // ===================================================

    console.log(
      "MLOps assigned to:",
      selectedCounsellor.name
    );


    console.log(
      "======================================"
    );


    // ===================================================
    // RETURN
    // ===================================================

    return {
      _id:
        selectedCounsellor._id,

      name:
        selectedCounsellor.name,
    };
  }


  // =====================================================
  // NORMAL REGULAR ASSIGNMENT
  // =====================================================

  async function assignRegularLead({
    leadsCollection,
    counsellorsCollection,
    assignmentStateCollection,
  }) {

    // ===================================================
    // GET AVAILABLE REGULAR COUNSELLORS
    // ===================================================

    const regularCounsellors =
      await counsellorsCollection
        .find({
          role: "counsellor",

          // Blocked excluded
          isBlocked: {
            $ne: true,
          },

          // Offline excluded
          availabilityStatus: {
            $ne: "offline",
          },

          $or: [
            {
              counsellorStatus:
                "regular",
            },

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


    // ===================================================
    // NO REGULAR COUNSELLORS
    // ===================================================

    if (
      regularCounsellors.length === 0
    ) {

      console.log(
        "Regular assignment: No available counsellors"
      );

      return null;
    }


    // ===================================================
    // COUNSELLOR IDS
    // ===================================================

    const regularCounsellorIds =
      regularCounsellors.map(
        (counsellor) =>
          counsellor._id
      );


    // ===================================================
    // COUNT CURRENT NEW LEADS
    // ===================================================

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
              _id:
                "$assignedTo._id",

              count: {
                $sum: 1,
              },
            },
          },
        ])
        .toArray();


    // ===================================================
    // COUNT MAP
    // ===================================================

    const leadCountMap =
      new Map(
        leadCounts.map(
          (item) => [
            item._id.toString(),
            item.count,
          ]
        )
      );


    // ===================================================
    // FIRST TRY BELOW MAX
    // ===================================================

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


    // ===================================================
    // FALLBACK
    //
    // If everyone is at 3+,
    // continue normal assignment.
    // ===================================================

    if (
      eligibleCounsellors.length === 0
    ) {

      console.log(
        "Regular assignment: Everyone reached MAX_NEW_LEADS."
      );

      console.log(
        "Regular assignment: Falling back to normal round robin."
      );

      eligibleCounsellors =
        regularCounsellors;
    }


    // ===================================================
    // GET ROUND ROBIN STATE
    // ===================================================

    const assignmentState =
      await assignmentStateCollection.findOne({
        _id: "regular_round_robin",
      });


    const lastCounsellorId =
      assignmentState?.lastCounsellorId
        ? assignmentState.lastCounsellorId.toString()
        : null;


    // ===================================================
    // LAST INDEX
    // ===================================================

    let lastIndex = -1;


    if (lastCounsellorId) {

      lastIndex =
        regularCounsellors.findIndex(
          (counsellor) =>
            counsellor._id.toString() ===
            lastCounsellorId
        );
    }


    // ===================================================
    // ROUND ROBIN
    // ===================================================

    let selectedCounsellor =
      null;


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


    // ===================================================
    // SAFETY
    // ===================================================

    if (!selectedCounsellor) {

      console.log(
        "Regular assignment: Could not select counsellor"
      );

      return null;
    }


    // ===================================================
    // SAVE STATE
    // ===================================================

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


    // ===================================================
    // LOG
    // ===================================================

    console.log(
      "Regular lead assigned to:",
      selectedCounsellor.name
    );


    // ===================================================
    // RETURN
    // ===================================================

    return {
      _id:
        selectedCounsellor._id,

      name:
        selectedCounsellor.name,
    };
  }


  // =====================================================
  // ESCAPE REGEX
  // =====================================================

  function escapeRegex(value) {
    return value.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
  }