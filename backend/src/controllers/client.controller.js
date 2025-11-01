const Client = require('../models/Client');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');

exports.create = async (req, res, next) => {
  try {
    const client = await Client.create(req.body);
    res.status(201).json(client);
  } catch (e) { next(e); }
};

exports.list = async (req, res, next) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 });
    res.json(clients);
  } catch (e) { next(e); }
};

exports.get = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
    const appts = await Appointment.find({ clientId: client._id }).sort({ date: -1, time: -1 });
    const payments = await Payment.find({ clientId: client._id }).sort({ createdAt: -1 });
    res.json({ client, history: appts, payments });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(client);
  } catch (e) { next(e); }
};
