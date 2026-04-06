const { Feedback, Student } = require("../Models");

exports.addFeedback = async (req, res) => {
  try {
    const userId = req.user.id;

    const student = await Student.findOne({ where: { user_id: userId } });

    const { rating, comment } = req.body;

    const feedback = await Feedback.create({
      student_id: student.id,
      rating,
      comment,
    });

    res.json({ msg: "Feedback added", feedback });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};