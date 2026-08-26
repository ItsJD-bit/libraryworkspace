 function updateDashboardDateTime() {
    const now = new Date();

    // Greeting
    const greetingText = document.getElementById('greeting-text');
    const hour = now.getHours();

    greetingText.textContent = hour < 12 ? 'morning' : 'afternoon';

    // Date
    const day = now.getDate();

    const month = now.toLocaleString('en-US', {
      month: 'long'
    });

    const year = now.getFullYear();

    document.getElementById('date-day').textContent = day;
    document.getElementById('date-full').textContent = `${month} ${year}`;
  }

  // Update immediately when the page loads
  updateDashboardDateTime();

  // Keep it synchronized with the system clock
  setInterval(updateDashboardDateTime, 60000);