
const Regex = {
  rating: /[\d ]{1,4}|[+-]{4}/,
  status: /[& \.#~^:]/,
  handleCode: /\((?:\*|B|C|T|U|CA|SR|TD|TM)\)/,
};
module.exports = Regex;
