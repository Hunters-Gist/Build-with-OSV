import twilio from 'twilio';
const client = twilio('AC', 'auth');
console.log(client.trunking.v1.trunks('TK123').recording().update.toString());
