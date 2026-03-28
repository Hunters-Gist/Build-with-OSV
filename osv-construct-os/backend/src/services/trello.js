import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.TRELLO_API_KEY;
const TOKEN = process.env.TRELLO_TOKEN;

// Create a new card on the designated Trello List
export const createTrelloCard = async (name, desc, listId) => {
    if (!API_KEY || API_KEY === 'dummy') return { success: true, simulated: true };
    if (!listId) return { success: false, error: 'No List ID provided for Trello Engine' };
    
    try {
        const res = await fetch(`https://api.trello.com/1/cards?idList=${listId}&key=${API_KEY}&token=${TOKEN}&name=${encodeURIComponent(name)}&desc=${encodeURIComponent(desc)}`, {
            method: 'POST',
            headers: { 'Accept': 'application/json' }
        });
        const data = await res.json();
        return { success: true, cardId: data.id };
    } catch (err) {
        console.error("OSV Trello Creation API Error:", err);
        return { success: false, error: err.message };
    }
};

// Dynamically move an active OSV pipeline card down the physical Trello board
export const moveTrelloCard = async (cardId, destListId) => {
    if (!API_KEY || API_KEY === 'dummy' || !cardId || !destListId) return { success: true, simulated: true };
    
    try {
        const res = await fetch(`https://api.trello.com/1/cards/${cardId}?idList=${destListId}&key=${API_KEY}&token=${TOKEN}`, {
            method: 'PUT',
            headers: { 'Accept': 'application/json' }
        });
        const data = await res.json();
        return { success: true, cardId: data.id };
    } catch (err) {
        console.error("OSV Trello Migration API Error:", err);
        return { success: false, error: err.message };
    }
};
