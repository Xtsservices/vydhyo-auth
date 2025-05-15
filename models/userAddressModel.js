const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    countrycode: { type: String, default: null },
    status: {
        type: String,
        enum: ['active', 'inActive'],
        default: 'inActive'
    },
    address: {
        type: String,
        default: null
    },
    city: {
        type: String,
        default: null
    },
    state: {
        type: String,
        default: null
    },
    country: {
        type: String,
        default: null
    },
    pincode: {
        type: String,
        default: null
    },
    latitude: {
        type: Number,
        default: null
    },
    longitude: {
        type: Number,
        default: null
    },
    createdBy: {
        type: String,
        default: null
    },
    updatedBy: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Address', addressSchema);