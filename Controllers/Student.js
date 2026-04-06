const { CareerUpdate, Student, Feedback, Training } = require("../Models");
const { Sequelize } = require("sequelize");

exports.updateCareer = async (req, res) => {
  try {
    const userId = req.user.id;

    const student = await Student.findOne({ where: { user_id: userId } });
    if (!student) return res.status(404).json({ msg: "Student not found" });

    const { company, role, salary, status, location } = req.body;

    const update = await CareerUpdate.create({
      student_id: student.id,
      company,
      role,
      salary,
      status,
      location,
      updated_at: new Date(),
    });

    res.json({ msg: "Career updated", update });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const student = await Student.findOne({ where: { user_id: userId } });
    if (!student) return res.status(404).json({ msg: "Student not found" });

    const updates = await CareerUpdate.findAll({
      where: { student_id: student.id },
      order: [["updated_at", "ASC"]],
    });

    const latestUpdate = updates.length ? updates[updates.length - 1] : null;

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

    const trainingStats = await Training.findAll({
      attributes: [
        "completion_status",
        [Sequelize.fn("COUNT", Sequelize.col("id")), "count"],
      ],
      where: { student_id: student.id },
      group: ["completion_status"],
      raw: true,
    });

    res.json({
      profile: {
        studentId: student.id,
        course: student.course,
        batch: student.batch,
      },
      progress: {
        totalCareerUpdates: updates.length,
        latestStatus: latestUpdate ? latestUpdate.status : null,
        latestCompany: latestUpdate ? latestUpdate.company : null,
        latestSalary: latestUpdate ? latestUpdate.salary : null,
      },
      feedback: {
        avgRating: Number(feedbackAgg?.avgRating || 0),
        totalFeedbacks: Number(feedbackAgg?.totalFeedbacks || 0),
      },
      training: trainingStats.map((row) => ({
        status: row.completion_status,
        count: Number(row.count),
      })),
      salaryTrend,
      updates,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};