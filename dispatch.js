'use strict';

const bookFlight = require('./book/flight');

module.exports = function(intentRequest) {
  
  const intentName = intentRequest.currentIntent.name;

  if (intentName === 'BookFlight') {
    return bookFlight(intentRequest);
  }

  throw new Error(`Intent with name ${intentName} not supported`);
};
