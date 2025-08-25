# Git Developer Analytics Dashboard  
## 🚀 Project Report  

---

## 🧾 Project Overview

The **Git Developer Analytics Dashboard** is a full-stack web application designed to analyze and visualize developer activity from Git repositories. It helps teams and individuals monitor productivity, working patterns, and code contribution trends by extracting and processing commit-level data.  

Using Node.js and Express on the backend, the system parses Git commit history, calculates metrics, and presents insights through an interactive web dashboard built with EJS templates. The dashboard highlights:

- Developer productivity and activity trends  
- Late-night or weekend work patterns  
- Commit message analysis (conventional vs. non-conventional)  
- Churn rate and large commit detection  
- Most active days and idle periods  

This tool provides a comprehensive view of developer behavior, aiding project management and self-assessment.

---

## 📊 Key Features

- 📅 **Commit Trends**: Analyze daily, weekly, and yearly commit patterns  
- 👤 **Developer Activity**: Track contributions of individual developers  
- 🕗 **Working Hours Insights**: Detect late-night commits and weekend work  
- ⚡ **Burnout Detection**: Identify long streaks of consecutive commits  
- 🔍 **Churn & Commit Analysis**: Detect fixes, deletions, and conventional commits  
- 📂 **Large Commit Tracking**: Highlight commits with significant changes  
- 📊 **Summary Reports**: Aggregate multiple repositories for overall insights  

---

## 🏗️ Tech Stack

### Backend
- **Node.js & Express**: Server and API development  
- **simple-git**: Parse Git repository commits  
- **File System (fs)**: Manage cloned repositories  
- **Date Utilities**: Convert UTC to IST for accurate timestamp analysis  
- **MongoDB** *(optional)*: Store historical analysis data  

### Frontend
- **EJS**: Dynamic HTML rendering  
- **Bootstrap / Custom CSS**: Styling and responsive layout  
- **Charts & Tables**: Display commit statistics, late-night work, and contributions  

---

## 📘 System Modules

1. **Repository Analyzer (`analyzer.js`)**  
   - Clone GitHub repositories if missing  
   - Parse commit logs, author info, timestamps, and messages  
   - Calculate metrics: late-night commits, weekend commits, churn rate, large commits, idle periods, most active day  

2. **Server (`server1.js`)**  
   - Handles user requests for analysis  
   - Renders EJS templates with repository metrics  
   - Aggregates multiple repositories into summary reports  

3. **Frontend (`index.ejs`)**  
   - Displays repository-level and aggregated metrics  
   - Interactive tables and charts for detailed insights  

---

## 📈 Metrics Tracked

- Total commits per day, week, and year  
- Developer-specific contributions  
- Late-night and weekend commit percentages  
- Burnout risk based on consecutive commit streaks  
- Idle periods between commits  
- Conventional vs. non-conventional commit messages  
- Large commits (insertions + deletions > 100 lines)  
- Languages used in the repository  

---

## 🔧 Future Enhancements

- Real-time GitHub webhook integration for live commit analysis  
- Frontend React migration for richer interactivity  
- Exportable PDF/Excel reports for project management  
- Role-based access for managers and contributors  
- AI-powered anomaly detection in commit behavior  

---

## ⚖️ License

This project is **open-source** and can be freely used and modified for educational purposes.  
