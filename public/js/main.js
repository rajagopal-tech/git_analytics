// public/js/main.js
document.addEventListener("DOMContentLoaded", () => {
  const summaryData = window.summaryData;

  // Commit Message Structure
  new Chart(document.getElementById('msgChart'), {
    type: 'pie',
    data: {
      labels: ['Short', 'Medium', 'Long'],
      datasets: [{
        data: [
          summaryData.commitMessageStructure.short,
          summaryData.commitMessageStructure.medium,
          summaryData.commitMessageStructure.long
        ],
        backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc']
      }]
    }
  });

  // Languages
  new Chart(document.getElementById('langChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(summaryData.languages),
      datasets: [{
        data: Object.values(summaryData.languages),
        backgroundColor: ['#ff6384','#36a2eb','#ffce56','#4bc0c0','#9966ff']
      }]
    }
  });

  // Work Progress
  new Chart(document.getElementById('progressChart'), {
    type: 'line',
    data: {
      labels: Object.keys(summaryData.workProgress),
      datasets: [{
        label: 'Commits',
        data: Object.values(summaryData.workProgress),
        borderColor: '#4e73df',
        backgroundColor: 'rgba(78, 115, 223, 0.2)',
        fill: true,
        tension: 0.3
      }]
    }
  });

  // Churn Rate
  new Chart(document.getElementById('churnChart'), {
    type: 'bar',
    data: {
      labels: Object.keys(summaryData.churnRate),
      datasets: [{
        label: 'Commits',
        data: Object.values(summaryData.churnRate),
        backgroundColor: '#1cc88a'
      }]
    }
  });
});
