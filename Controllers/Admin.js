const { CareerUpdate, Student, Feedback, Reminder, User, Training } = require("../Models");
const { Sequelize, Op } = require("sequelize");

function parseDateRange(startDate, endDate) {
  if (!startDate && !endDate) {
    return null;
  }

  const range = {};

  if (startDate) {
    const parsedStart = new Date(startDate);
    if (Number.isNaN(parsedStart.getTime())) {
      throw new Error("Invalid startDate. Use ISO date format, e.g. 2026-04-01");
    }
    range[Op.gte] = parsedStart;
  }

  if (endDate) {
    const parsedEnd = new Date(endDate);
    if (Number.isNaN(parsedEnd.getTime())) {
      throw new Error("Invalid endDate. Use ISO date format, e.g. 2026-04-30");
    }
    range[Op.lte] = parsedEnd;
  }

  return range;
}

function toNumber(value) {
  return Number(value || 0);
}

function getSearchLike(query) {
  return `%${String(query).trim()}%`;
}

async function buildStudentProfileAnalytics(studentId) {
  const student = await Student.findOne({
    where: { id: studentId },
    include: [
      {
        model: User,
        attributes: ["id", "name", "email", "role", "created_at"],
      },
    ],
  });

  if (!student) {
    return null;
  }

  const updates = await CareerUpdate.findAll({
    where: { student_id: student.id },
    order: [["updated_at", "ASC"]],
  });

  const latestUpdate = updates.length ? updates[updates.length - 1] : null;
  const placedUpdates = updates.filter((entry) => entry.status === "placed").length;
  const placementRate = updates.length
    ? Number(((placedUpdates / updates.length) * 100).toFixed(2))
    : 0;

  const salaryValues = updates
    .map((entry) => toNumber(entry.salary))
    .filter((value) => Number.isFinite(value) && value !== 0);

  const salary = salaryValues.length
    ? {
        avg: Number((salaryValues.reduce((sum, value) => sum + value, 0) / salaryValues.length).toFixed(2)),
        min: Math.min(...salaryValues),
        max: Math.max(...salaryValues),
      }
    : { avg: 0, min: 0, max: 0 };

  const salaryTrend = updates
    .filter((entry) => entry.salary !== null && entry.salary !== undefined)
    .map((entry) => ({
      date: entry.updated_at,
      salary: Number(entry.salary),
    }));

  const feedbackAgg = await Feedback.findOne({
    attributes: [
      [Sequelize.fn("AVG", Sequelize.col("rating")), "avgRating"],
      [Sequelize.fn("COUNT", Sequelize.col("id")), "totalFeedbacks"],
    ],
    where: { student_id: student.id },
    raw: true,
  });

  const feedbackByRating = await Feedback.findAll({
    attributes: ["rating", [Sequelize.fn("COUNT", Sequelize.col("id")), "count"]],
    where: { student_id: student.id },
    group: ["rating"],
    order: [["rating", "ASC"]],
    raw: true,
  });

  const trainingStats = await Training.findAll({
    attributes: [
      "completion_status",
      [Sequelize.fn("COUNT", Sequelize.col("id")), "count"],
    ],
    where: { student_id: student.id },
    group: ["completion_status"],
    raw: true,
  });

  const reminder = await Reminder.findOne({
    where: { student_id: student.id },
    raw: true,
  });

  const now = new Date();
  const nextDue = reminder?.next_due ? new Date(reminder.next_due) : null;
  const lastUpdated = reminder?.last_updated ? new Date(reminder.last_updated) : null;

  return {
    student: {
      id: student.id,
      name: student.User?.name || null,
      email: student.User?.email || null,
      course: student.course || null,
      batch: student.batch || null,
      phone: student.phone || null,
      gender: student.gender || null,
      enrollment_date: student.enrollment_date || null,
      role: student.User?.role || null,
    },
    progress: {
      totalCareerUpdates: updates.length,
      placedUpdates,
      placementRate,
      latestStatus: latestUpdate ? latestUpdate.status : null,
      latestCompany: latestUpdate ? latestUpdate.company : null,
      latestSalary: latestUpdate ? latestUpdate.salary : null,
    },
    salary,
    salaryTrend,
    feedback: {
      avgRating: toNumber(feedbackAgg?.avgRating),
      totalFeedbacks: toNumber(feedbackAgg?.totalFeedbacks),
      ratingDistribution: feedbackByRating.map((entry) => ({
        rating: toNumber(entry.rating),
        count: toNumber(entry.count),
      })),
    },
    training: trainingStats.map((row) => ({
      status: row.completion_status,
      count: toNumber(row.count),
    })),
    reminder: reminder
      ? {
          lastUpdated,
          nextDue,
          daysLeft: nextDue
            ? Math.ceil((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null,
          status: nextDue && nextDue <= now ? "due" : "upcoming",
        }
      : null,
    updates,
  };
}

exports.searchStudents = async (req, res) => {
  try {
    const query = String(req.query.q || req.query.search || "").trim();
    const field = String(req.query.field || req.query.type || "all").toLowerCase();
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);

    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const like = getSearchLike(query);

    let userIds = [];
    let studentWhere = {};

    if (field === "name") {
      userIds = (
        await User.findAll({
          attributes: ["id"],
          where: { name: { [Op.like]: like } },
          raw: true,
        })
      ).map((row) => row.id);
      if (!userIds.length) {
        return res.json({ query, field, total: 0, results: [] });
      }
    } else if (field === "email") {
      userIds = (
        await User.findAll({
          attributes: ["id"],
          where: { email: { [Op.like]: like } },
          raw: true,
        })
      ).map((row) => row.id);
      if (!userIds.length) {
        return res.json({ query, field, total: 0, results: [] });
      }
    } else if (field === "course") {
      studentWhere = { course: { [Op.like]: like } };
    } else if (field === "batch") {
      studentWhere = { batch: { [Op.like]: like } };
    } else if (field === "phone") {
      studentWhere = { phone: { [Op.like]: like } };
    } else if (field === "gender") {
      studentWhere = { gender: { [Op.like]: like } };
    } else if (field === "id" || field === "studentid") {
      const studentId = Number(query);
      if (Number.isNaN(studentId)) {
        return res.status(400).json({ error: "studentId search requires a numeric value" });
      }
      studentWhere = { id: studentId };
    } else {
      const matchingUsers = await User.findAll({
        attributes: ["id"],
        where: {
          [Op.or]: [
            { name: { [Op.like]: like } },
            { email: { [Op.like]: like } },
          ],
        },
        raw: true,
      });

      userIds = matchingUsers.map((row) => row.id);
      studentWhere = {
        [Op.or]: [
          { course: { [Op.like]: like } },
          { batch: { [Op.like]: like } },
          { phone: { [Op.like]: like } },
          { gender: { [Op.like]: like } },
        ],
      };
    }

    const students = await Student.findAll({
      where: {
        ...studentWhere,
        ...(userIds.length ? { user_id: { [Op.in]: userIds } } : {}),
      },
      include: [
        {
          model: User,
          attributes: ["id", "name", "email", "role"],
        },
      ],
      limit,
      order: [["id", "ASC"]],
    });

    const results = [];

    for (const student of students) {
      const analytics = await buildStudentProfileAnalytics(student.id);
      if (analytics) {
        results.push({
          id: analytics.student.id,
          name: analytics.student.name,
          email: analytics.student.email,
          course: analytics.student.course,
          batch: analytics.student.batch,
          phone: analytics.student.phone,
          gender: analytics.student.gender,
          summary: analytics.progress,
        });
      }
    }

    res.json({
      query,
      field,
      total: results.length,
      results,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStudentAnalytics = async (req, res) => {
  try {
    const studentId = Number(req.params.studentId);

    if (Number.isNaN(studentId)) {
      return res.status(400).json({ error: "Valid studentId is required" });
    }

    const analytics = await buildStudentProfileAnalytics(studentId);

    if (!analytics) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(analytics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateRange = parseDateRange(startDate, endDate);
    const careerWhere = dateRange ? { updated_at: dateRange } : {};
    const feedbackWhere = dateRange ? { created_at: dateRange } : {};

    const totalStudents = await Student.count();

    const activeStudents = await CareerUpdate.count({
      where: careerWhere,
      distinct: true,
      col: "student_id",
    });

    const placedStudents = await CareerUpdate.count({
      where: {
        ...careerWhere,
        status: "placed",
      },
      distinct: true,
      col: "student_id",
    });

    const placementRate = activeStudents
      ? Number(((placedStudents / activeStudents) * 100).toFixed(2))
      : 0;

    const salaryAgg = await CareerUpdate.findOne({
      attributes: [
        [Sequelize.fn("AVG", Sequelize.col("salary")), "avgSalary"],
        [Sequelize.fn("MIN", Sequelize.col("salary")), "minSalary"],
        [Sequelize.fn("MAX", Sequelize.col("salary")), "maxSalary"],
      ],
      where: careerWhere,
      raw: true,
    });

    const feedbackAgg = await Feedback.findOne({
      attributes: [
        [Sequelize.fn("AVG", Sequelize.col("rating")), "avgRating"],
        [Sequelize.fn("COUNT", Sequelize.col("id")), "totalFeedbacks"],
      ],
      where: feedbackWhere,
      raw: true,
    });

    const feedbackByRating = await Feedback.findAll({
      attributes: ["rating", [Sequelize.fn("COUNT", Sequelize.col("id")), "count"]],
      where: feedbackWhere,
      group: ["rating"],
      order: [["rating", "ASC"]],
      raw: true,
    });

    const topCompanies = await CareerUpdate.findAll({
      attributes: ["company", [Sequelize.fn("COUNT", Sequelize.col("id")), "count"]],
      where: {
        ...careerWhere,
        company: {
          [Op.ne]: null,
        },
      },
      group: ["company"],
      order: [[Sequelize.literal("count"), "DESC"]],
      limit: 10,
      raw: true,
    });

    const statusDistribution = await CareerUpdate.findAll({
      attributes: ["status", [Sequelize.fn("COUNT", Sequelize.col("id")), "count"]],
      where: careerWhere,
      group: ["status"],
      order: [[Sequelize.literal("count"), "DESC"]],
      raw: true,
    });

    res.json({
      totals: {
        totalStudents,
        activeStudents,
        placedStudents,
        placementRate,
        totalFeedbacks: toNumber(feedbackAgg?.totalFeedbacks),
      },
      salary: {
        avg: toNumber(salaryAgg?.avgSalary),
        min: toNumber(salaryAgg?.minSalary),
        max: toNumber(salaryAgg?.maxSalary),
      },
      feedback: {
        avgRating: toNumber(feedbackAgg?.avgRating),
        ratingDistribution: feedbackByRating.map((entry) => ({
          rating: toNumber(entry.rating),
          count: toNumber(entry.count),
        })),
      },
      companies: topCompanies.map((entry) => ({
        company: entry.company,
        count: toNumber(entry.count),
      })),
      status: statusDistribution.map((entry) => ({
        status: entry.status,
        count: toNumber(entry.count),
      })),
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMonthlyTrends = async (req, res) => {
  try {
    const months = Math.min(Math.max(Number(req.query.months || 12), 1), 36);
    const start = new Date();
    start.setMonth(start.getMonth() - (months - 1));
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const careerTrendRows = await CareerUpdate.findAll({
      attributes: [
        [Sequelize.fn("DATE_FORMAT", Sequelize.col("updated_at"), "%Y-%m"), "month"],
        [Sequelize.fn("AVG", Sequelize.col("salary")), "avgSalary"],
        [
          Sequelize.fn(
            "SUM",
            Sequelize.literal("CASE WHEN status = 'placed' THEN 1 ELSE 0 END")
          ),
          "placements",
        ],
        [Sequelize.fn("COUNT", Sequelize.col("id")), "careerUpdates"],
      ],
      where: {
        updated_at: {
          [Op.gte]: start,
        },
      },
      group: [Sequelize.fn("DATE_FORMAT", Sequelize.col("updated_at"), "%Y-%m")],
      order: [[Sequelize.literal("month"), "ASC"]],
      raw: true,
    });

    const feedbackTrendRows = await Feedback.findAll({
      attributes: [
        [Sequelize.fn("DATE_FORMAT", Sequelize.col("created_at"), "%Y-%m"), "month"],
        [Sequelize.fn("AVG", Sequelize.col("rating")), "avgRating"],
        [Sequelize.fn("COUNT", Sequelize.col("id")), "feedbackCount"],
      ],
      where: {
        created_at: {
          [Op.gte]: start,
        },
      },
      group: [Sequelize.fn("DATE_FORMAT", Sequelize.col("created_at"), "%Y-%m")],
      order: [[Sequelize.literal("month"), "ASC"]],
      raw: true,
    });

    const trendMap = new Map();

    for (const row of careerTrendRows) {
      trendMap.set(row.month, {
        month: row.month,
        avgSalary: toNumber(row.avgSalary),
        placements: toNumber(row.placements),
        careerUpdates: toNumber(row.careerUpdates),
        avgRating: 0,
        feedbackCount: 0,
      });
    }

    for (const row of feedbackTrendRows) {
      const existing = trendMap.get(row.month) || {
        month: row.month,
        avgSalary: 0,
        placements: 0,
        careerUpdates: 0,
      };

      trendMap.set(row.month, {
        ...existing,
        avgRating: toNumber(row.avgRating),
        feedbackCount: toNumber(row.feedbackCount),
      });
    }

    const monthly = Array.from(trendMap.values()).sort((a, b) =>
      a.month.localeCompare(b.month)
    );

    res.json({
      months,
      startMonth: start.toISOString(),
      monthly,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getReminderStatus = async (req, res) => {
  try {
    const dueOnly = req.query.dueOnly === "true";
    const now = new Date();

    const reminderWhere = dueOnly
      ? {
          next_due: {
            [Op.lte]: now,
          },
        }
      : {};

    const reminders = await Reminder.findAll({
      where: reminderWhere,
      include: [
        {
          model: Student,
          attributes: ["id", "course", "batch"],
          include: [
            {
              model: User,
              attributes: ["id", "name", "email"],
            },
          ],
        },
      ],
      order: [["next_due", "ASC"]],
    });

    const rows = reminders.map((reminder) => {
      const nextDue = reminder.next_due ? new Date(reminder.next_due) : null;
      const lastUpdated = reminder.last_updated ? new Date(reminder.last_updated) : null;
      const daysLeft = nextDue
        ? Math.ceil((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        studentId: reminder.Student?.id || null,
        name: reminder.Student?.User?.name || null,
        email: reminder.Student?.User?.email || null,
        course: reminder.Student?.course || null,
        batch: reminder.Student?.batch || null,
        lastUpdated,
        nextDue,
        daysLeft,
        status: nextDue && nextDue <= now ? "due" : "upcoming",
      };
    });

    res.json({
      total: rows.length,
      dueOnly,
      reminders: rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};