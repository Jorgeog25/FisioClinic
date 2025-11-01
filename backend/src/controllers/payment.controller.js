const Payment = require('../models/Payment');

exports.create = async (req, res, next) => {
  try {
    const payment = await Payment.create(req.body);
    res.status(201).json(payment);
  } catch (e) { next(e); }
};

exports.listByClient = async (req, res, next) => {
  try {
    const payments = await Payment.find({ clientId: req.params.clientId }).sort({ createdAt: -1 });
    res.json(payments);
  } catch (e) { next(e); }
};
