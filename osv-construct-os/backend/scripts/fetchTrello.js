import dotenv from 'dotenv';
dotenv.config(); // Use PWD mapping

async function run() {
  try {
    const key = process.env.TRELLO_API_KEY;
    const token = process.env.TRELLO_TOKEN;
    const res = await fetch(`https://api.trello.com/1/members/me/boards?key=${key}&token=${token}`);
    const boards = await res.json();

    console.log('--- TRELLO BOARDS ORCHESTRATION ---');
    if (!Array.isArray(boards)) {
      console.log('Error fetching boards. Verify API key and Token validity.');
      console.log(boards);
      return;
    }
    
    for (const b of boards) {
      console.log(`Board => ${b.name}\nBOARD_ID=${b.id}`);
      const listRes = await fetch(`https://api.trello.com/1/boards/${b.id}/lists?key=${key}&token=${token}`);
      const lists = await listRes.json();
      if(Array.isArray(lists)){
        for (const l of lists) {
          console.log(`  - List => ${l.name} (ID: ${l.id})`);
        }
      }
      console.log('-----------------------------------')
    }
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}
run();
