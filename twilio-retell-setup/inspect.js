import Retell from 'retell-sdk';

const retell = new Retell({ apiKey: process.env.RETELL_API_KEY });
console.log(Object.keys(retell));
console.log('--- call method keys ---');
if (retell.call) console.log(Object.keys(retell.call));
console.log('--- agent keys ---');
if (retell.agent) console.log(Object.keys(retell.agent));
console.log('--- phoneNumber keys ---');
if (retell.phoneNumber) console.log(Object.keys(retell.phoneNumber));
