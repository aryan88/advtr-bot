'use strict';

const handleDialogCodeHook = require('./manageDialogs');

module.exports = function(intentRequest) {
  const source = intentRequest.invocationSource;

  if (source === 'DialogCodeHook') {
    return handleDialogCodeHook(intentRequest);
  }

};
