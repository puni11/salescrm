import * as XLSX from "xlsx";
export const exportToExcel = (leads) => {
  try {
    if (!leads || leads.length === 0) {
      alert("No leads available to export");
      return;
    }

    const formatDate = (date) => {
      if (!date) return "";

      try {
        return new Date(date).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        return "";
      }
    };

    const excelData = leads.map((lead) => ({
      Name:
        lead.name ||
        lead.fullName ||
        "",

      Email:
        lead.email ||
        "",

      Phone:
        lead.phone ||
        lead.mobile ||
        "",

      Course:
        lead.course ||
        lead.courseName ||
        "",

      Source:
        lead.source ||
        lead.from ||
        "",

      "Assigned To":
        lead.assignedTo?.name ||
        lead.assignedCounsellor?.name ||
        lead.counsellor?.name ||
        lead.assignedTo ||
        "",

      "Last Comment":
        lead.lastComment ||
        lead.comment ||
        lead.latestComment ||
        "",

      "Admin Created Date":
        formatDate(
          lead.adminCreatedAt ||
          lead.admin_created_at ||
          lead.createdByAdminAt
        ),

      "Created Date":
        formatDate(
          lead.createdAt
        ),

      "Updated Date":
        formatDate(
          lead.updatedAt
        ),
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    const columnWidths = [
      { wch: 25 }, // Name
      { wch: 30 }, // Email
      { wch: 18 }, // Phone
      { wch: 25 }, // Course
      { wch: 18 }, // Source
      { wch: 25 }, // Assigned To
      { wch: 50 }, // Last Comment
      { wch: 22 }, // Admin Created
      { wch: 22 }, // Created
      { wch: 22 }, // Updated
    ];

    worksheet["!cols"] = columnWidths;

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Leads"
    );

    const today = new Date().toISOString().split("T")[0];

    XLSX.writeFile(
      workbook,
      `Leads_${today}.xlsx`
    );
  } catch (error) {
    console.error("Excel export failed:", error);
    alert("Failed to export Excel file");
  }
};