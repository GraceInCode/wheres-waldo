const photo = document.getElementById('photo');
const targetBox = document.getElementById('target-box');
const markers = document.getElementById('markers');

// DEBUG MODE - Set to true to see clickable areas
const DEBUG_MODE = false;

let startTime = Date.now();
let timeInterval;

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Show debug boxes for character positions
async function showDebugBoxes() {
    if (!DEBUG_MODE) return;
    
    const response = await fetch('/debug/characters');
    const characters = await response.json();
    const rect = photo.getBoundingClientRect();
    
    characters.forEach(char => {
        const debugBox = document.createElement('div');
        debugBox.style.position = 'absolute';
        targetBox.style.background = 'white';
        targetBox.style.border = '1px solid black';
        targetBox.style.padding = '10px';
        targetBox.style.zIndex = '1000';
        debugBox.style.left = `${char.x * rect.width - 25}px`;
        debugBox.style.top = `${char.y * rect.height - 25}px`;
        debugBox.style.width = '50px';
        debugBox.style.height = '50px';
        debugBox.style.border = '3px solid yellow';
        debugBox.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
        debugBox.style.pointerEvents = 'none';
        debugBox.style.zIndex = '1000';
        
        // Add character image inside box
        if (char.imageUrl) {
            const charImg = document.createElement('img');
            charImg.src = char.imageUrl;
            charImg.style.width = '30px';
            charImg.style.height = '30px';
            charImg.style.borderRadius = '50%';
            charImg.style.position = 'absolute';
            charImg.style.top = '10px';
            charImg.style.left = '10px';
            debugBox.appendChild(charImg);
        }
        
        // Add name span
        debugBox.innerHTML += `<span style="color: black; font-weight: bold; font-size: 10px; background: white; padding: 2px;">${char.name}</span>`;
        
        markers.appendChild(debugBox);
        
        console.log(`Debug box for ${char.name}: x=${char.x}, y=${char.y}, image=${char.imageUrl}`);
    });
}

window.addEventListener('load', () => {
    timeInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        document.getElementById('timer').textContent = `Time: ${formatTime(elapsed)}`;
    }, 1000);
    
    // Show debug boxes if in debug mode
    if (DEBUG_MODE) {
        if (photo.complete) {
            showDebugBoxes();
        } else {
            photo.addEventListener('load', showDebugBoxes);
        }
    }
});

let foundCount = 0;
const totalChars = document.querySelectorAll('.char-option').length;  // Count options

photo.addEventListener('click', (e) => {
    const rect = photo.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Position box
    targetBox.style.position = 'absolute';
    targetBox.style.left = `${e.clientX - 25}px`;
    targetBox.style.top = `${e.clientY - 25}px`;
    targetBox.style.display = 'block';

    // Add click handlers to options
    const options = document.querySelectorAll('.char-option');
    options.forEach(option => {
        option.onclick = async (evt) => {
            evt.stopPropagation();  // Prevent hide
            const charId = option.dataset.charId;
            targetBox.style.display = 'none';
            const response = await fetch('/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ x, y, characterId: charId }),
            });
            const data = await response.json();

            if (data.success) {
                // Place marker (as before)
                const marker = document.createElement('div');
                marker.style.position = 'absolute';
                marker.style.left = `${data.position.x * rect.width + rect.left}px`;
                marker.style.top = `${data.position.y * rect.height + rect.top}px`;
                marker.style.width = '10px';
                marker.style.height = '10px';
                marker.style.background = 'green';
                markers.appendChild(marker);

                foundCount++;
                if (data.allFound) {
                    alert(`You found all in ${data.time} seconds! Enter your name for high scores.`);
                    const name = prompt('Your name:');
                    await fetch('/scores', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name }),
                    });
                    clearInterval(timeInterval);
                    window.location.href = '/highscores';
                }
            } else {
                alert(data.message || 'Wrong!');
            }
        };
    });
});

// Hide box if click away
document.addEventListener('click', (e) => {
    if (!targetBox.contains(e.target) && e.target !== photo) {
        targetBox.style.display = 'none';
    }
});

window.addEventListener('resize', () => {
  if (DEBUG_MODE) showDebugBoxes();  // Reposition on resize
});