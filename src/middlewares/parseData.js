const catchAsync = require('../helpers/catchAsync')
 
const parseData = () => {
  return catchAsync(async (req, res, next) => {
    if (req?.body?.data) {
      if (typeof req.body.data === 'string') {
        try {
          req.body = JSON.parse(req.body.data);
        } catch (e) {
          // Keep as is if not valid JSON string
        }
      } else if (typeof req.body.data === 'object' && req.body.data !== null) {
        req.body = req.body.data;
      }
    }

    next();
  });
};


module.exports = parseData;