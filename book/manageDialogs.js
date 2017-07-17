'use strict';

const lexResponses = require('../lexResponses');
const request = require('request');
const rp = require('request-promise');
const airportsjs = require("airportsjs")

function buildValidationResult(isValid, violatedSlot, messageContent, slotValue) {
  if (messageContent == null) {
    return {
      isValid,
      violatedSlot,
      slotValue
    };
  }
  
  return {
    isValid,
    violatedSlot,
    message: { contentType: 'PlainText', content: messageContent }
  };
}

function validateFlightOrder(FromAirport, ToAirport, Dates, callback) {
  
  //Validate from destination
  if (FromAirport && ToAirport == null && Dates == null) {

    if(FromAirport.length > 3) {    
      var airportCode = airportsjs.searchByAirportName(FromAirport);
      
      if(airportCode.length == 0) {

        return callback(buildValidationResult(false, 'FromAirport', `We cannot find ${FromAirport}, would you like to try different from location?.`, null));
      
      } else if(airportCode.length == 1) {
      
        return callback(buildValidationResult(true, 'FromAirport', null, airportCode[0]['iata']));  
      
      } else {

        var airportSelection = '';
        var i = 0; 
        for(i=0; i < airportCode.length; i++) {
          airportSelection += airportCode[i]['name']+' - '+ airportCode[i]['iata']+', ';
        }
        airportSelection = airportSelection.substring(0, airportSelection.length - 2);

        return callback(buildValidationResult(false, 'FromAirport', `We found more than one airport for ${FromAirport}, Please select one by entering 3 letter code - `+ airportSelection, null));
      }
    } else {
      return callback(buildValidationResult(true, 'FromAirport', null, FromAirport));  
    }
    
  }

  //Validate to destionation
  if (ToAirport && Dates == null) {
    
    if(ToAirport.length > 3) {

      var airportCode = airportsjs.searchByAirportName(ToAirport);
      
      if(airportCode.length == 0) {

        return callback(buildValidationResult(false, 'ToAirport', `We cannot find ${ToAirport}, would you like to try different to location?`, null));
      
      } else if(airportCode.length == 1) {
      
        return callback(buildValidationResult(true, 'ToAirport', null, airportCode[0]['iata']));  
      
      } else {

        var airportSelection = '';
        var i = 0; 
        for(i=0; i < airportCode.length; i++) {
          airportSelection += airportCode[i]['name']+' - '+ airportCode[i]['iata']+', ';
        }
        airportSelection = airportSelection.substring(0, airportSelection.length - 2);

        return callback(buildValidationResult(false, 'ToAirport', `We found more than one airport for ${ToAirport}, Please select one by entering 3 letter code - `+ airportSelection, null));
      }  
    } else {
      return callback(buildValidationResult(true, 'ToAirport', null, ToAirport));  
    }
    

    
  }

  if (ToAirport && FromAirport && Dates) {
      
      //@Todo - Handle token expiration
      const options = {  
        url: 'https://api.test.sabre.com/v2/shop/flights/fares?origin='+FromAirport+'&destination='+ToAirport+'&lengthofstay=5&departuredate='+Dates+'&pointofsalecountry=US',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer T1RLAQLQp9disvFzUNHJCo6NXJXGrFZz5RAMc99TxNFNYQteERzNvh8rAADAomPAKLay/hsFBbePrXFd5uvuqNQGpGhT3A1tSbiO6bzZslcjK+F/1zRuvpZeGO31ir56nVHC12X3fp5T0aKEDnLz3KuLgjBzjfbB5eJTJ7FAbRzXxgl+MMA8bJtaWy7RhFbGz8tnBDwsiuXD/inlrAXaRp+Y1E0xwpq1qVWiBLwR4e1x4LfcqYXQYtr5/7zzd5eQl4QDUg9ktAa1qkixQnBKGLf+UFl77yO/O4UTQ9jZ1c41W011S0YPJIWKv01B'
        }
      };

      var message;
      return rp(options)
        .then(function (body) {
          var result = JSON.parse(body);
          message = result.FareInfo[0]['LowestFare']['AirlineCodes'][0]+' $'+result.FareInfo[0]['LowestFare']['Fare']+' ';
          
          if(result.FareInfo[1] != undefined) {
            message += result.FareInfo[1]['LowestFare']['AirlineCodes'][0]+' $'+result.FareInfo[1]['LowestFare']['Fare']+' ';
          }

          if(result.FareInfo[2] != undefined) {
            message += result.FareInfo[2]['LowestFare']['AirlineCodes'][0]+' $'+result.FareInfo[2]['LowestFare']['Fare'];
          }
          
          return callback(buildValidationResult(true, 'Dates', message, null));
        })
        .catch(function (err) {
            // POST failed... 
            console.log(err);
            return callback(buildValidationResult(false, 'FromAirport', 'We cannot find any result. Would you like to try different destination?', null));
            
        });

  } else {
    return callback(buildValidationResult(true, null, null, null));  
  }

  
}


module.exports = function(intentRequest) {
  var FromAirport = intentRequest.currentIntent.slots.FromAirport;
  var ToAirport = intentRequest.currentIntent.slots.ToAirport;
  var Dates = intentRequest.currentIntent.slots.Dates;
  var slots = intentRequest.currentIntent.slots;

  return validateFlightOrder(FromAirport, ToAirport, Dates, function(validationResult){
  
  if (!validationResult.isValid) {
    slots[`${validationResult.violatedSlot}`] = null;
    return Promise.resolve(lexResponses.elicitSlot(intentRequest.sessionAttributes, intentRequest.currentIntent.name, slots, validationResult.violatedSlot, validationResult.message));
  }

  if (validationResult.violatedSlot == 'Dates') {

    slots[`${validationResult.violatedSlot}`] = null;
    return Promise.resolve(lexResponses.confirmIntent(intentRequest.sessionAttributes, intentRequest.currentIntent.name, slots, validationResult.message));
  }

  //Set IATA code if user has entered city
  if(validationResult.violatedSlot == 'FromAirport') {
   intentRequest.currentIntent.slots.FromAirport =  validationResult.slotValue;
  }

  if(validationResult.violatedSlot == 'ToAirport') {
   intentRequest.currentIntent.slots.ToAirport =  validationResult.slotValue;
  }

  return Promise.resolve(lexResponses.delegate(intentRequest.sessionAttributes, intentRequest.currentIntent.slots));
  
  });

  
};
