import mongoose from 'mongoose';
import DailyClosing from '../models/DailyClosing.js';

export const getDailyClosings = async (req, res, next) => {
  try {
    const { date, startDate, endDate } = req.query;
    let query = {};
    if (date) query.date = date;
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    const records = await DailyClosing.find(query).sort({ date: -1 });
    res.status(200).json({
      success: true,
      count: records.length,
      dailyClosings: records,
    });
  } catch (err) {
    next(err);
  }
};

export const getDailyClosingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjId = mongoose.Types.ObjectId.isValid(id);
    const record = isObjId
      ? await DailyClosing.findById(id)
      : await DailyClosing.findOne({ $or: [{ clientId: id }, { date: id }] });

    if (!record) {
      return res.status(404).json({ success: false, message: 'Daily closing record not found' });
    }
    res.status(200).json({ success: true, dailyClosing: record });
  } catch (err) {
    next(err);
  }
};

export const createDailyClosing = async (req, res, next) => {
  try {
    const data = { ...req.body };
    const clientId = data.clientId || data._id || data.id || `closing_${Date.now()}`;
    const date = data.date || new Date().toISOString().slice(0, 10);
    const createdBy = req.user ? req.user._id : 'owner';

    const record = await DailyClosing.findOneAndUpdate(
      { $or: [{ clientId }, { date }] },
      { $set: { ...data, clientId, date, createdBy } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ success: true, dailyClosing: record });
  } catch (err) {
    next(err);
  }
};

export const updateDailyClosing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjId ? { _id: id } : { $or: [{ clientId: id }, { date: id }] };

    const record = await DailyClosing.findOneAndUpdate(query, req.body, { new: true });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Daily closing record not found' });
    }
    res.status(200).json({ success: true, dailyClosing: record });
  } catch (err) {
    next(err);
  }
};

export const deleteDailyClosing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjId ? { _id: id } : { clientId: id };

    await DailyClosing.findOneAndDelete(query);
    res.status(200).json({ success: true, message: 'Daily closing deleted' });
  } catch (err) {
    next(err);
  }
};
