const API_BASE = 'http://localhost:8000';

export async function healthCheck() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Health check failed:', error);
        throw error;
    }
}

export async function getTasks() {
    try {
        const response = await fetch(`${API_BASE}/tasks`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Failed to get tasks:', error);
        throw error;
    }
}

export async function createTask(task) {
    try {
        const response = await fetch(`${API_BASE}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(task),
        });
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Failed to create task:', error);
        throw error;
    }
}
