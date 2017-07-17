'use strict';

const dispatch = require('./dispatch');

module.exports.intents = (event, context, callback) => {
  try {
    dispatch(event).then(response => {
      callback(null, response);
    });
  } catch (err) {
    callback(err);
  }
};
