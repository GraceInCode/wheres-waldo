const photo = document.getElementById('photo');
const targetBox = document.getElementById('target-box');
const charSelect = document.getElementById('char-select');
const markers = document.getElementById('markers');

let startTime = Date.now(); // Client-side start (for display only)
let timeInterval;

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

window.addEventListener('load', () => {
    timeInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        document.getElementById('timer').textContent = `Time: ${formatTime(elapsed)}`;
    }, 1000);
});

let foundCount = 0;
const totalChars = charSelect.options.length;

photo.addEventListener('click', (e) => {
    const rect = photo.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width; // Normalize to [0, 1]
    const y = (e.clientY - rect.top) / rect.height; // Normalize to [0, 1]

    // Position box 
    targetBox.style.left = `${e.clientX - 25}px`; // Center box
    targetBox.style.top = `${e.clientY - 25}px`;
    targetBox.style.display = 'block';

    charSelect.onchange = async () => {
        const charId = charSelect.value;
        targetBox.style.display = 'none';
        const response = await fetch('/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x, y, characterId: charId })
        });
        const data = await response.json();

        if (data.success) {
            // Place marker (e.g. green box at real pos)
            const marker = document.createElement('div');
            marker.style.position = 'absolute';
            marker.style.left = `${data.position.x * rect.width}px`;
            marker.style.top = `${data.position.y * rect.height}px`;
            marker.style.width = '10px';
            marker.style.height = '10px';
            marker.style.background = 'green';
            markers.appendChild(marker);

            foundCount++;
            if (data.allFound) {
                clearInterval(timeInterval);
                alert(`You found all in ${data.time} seconds! Enter your name for high scores.`);
                const name = prompt('Enter your name:');
                await fetch('/scores', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name }),
                });
                window.location.href = '/highscores';
                // Show scores
                const scoresResp = await fetch('/scores');
                const scoresData = await scoresResp.json();
                alert('High Scores:\n' + scoresData.map(s => `${s.name}: ${s.time}s`).join('\n'));
            }
        } else {
            alert(data.message || 'Try again!');
        }
    };
});

// Hide box if click away
document.addEventListener('click', (e) => {
    if (!targetBox.contains(e.target) && e.target !== photo) {
        targetBox.style.display = 'none';
    }
})