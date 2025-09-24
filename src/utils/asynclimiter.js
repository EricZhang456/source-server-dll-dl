// copilot won big

/**
 * Run with a limit on how many tasks can be run at a time.
 * @param {Promise<any[]>} tasks 
 * @param {number} limit 
 * @returns {Promise<any[]>}
 */
export async function runWithConcurrencyLimit(tasks, limit) {
    const results = [];
    let i = 0;
    async function next() {
        if (i >= tasks.length) return;
        const currentIndex = i++;
        results[currentIndex] = await tasks[currentIndex]();
        await next();
    }
    const runners = [];
    for (let j = 0; j < Math.min(limit, tasks.length); j++) {
        runners.push(next());
    }
    await Promise.all(runners);
    return results;
}
