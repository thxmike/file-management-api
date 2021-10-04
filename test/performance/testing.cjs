//const syswidecas = require("syswide-cas");

//syswidecas.addCAs("/etc/ssl/certs");

let beforeRequestHandler = (requestParams, context, ee, next) => {
  let page = Math.floor(Math.random() * 6) + 1;
  //console.log(page);

  context.vars.page = page;
  return next();
};

module.exports = {
  beforeRequestHandler,
};

/*
 *function setupCA(requestParams, context, ee, next) {
 *  return next(); //MUST be called for the scenario to continue
 *}
 */
