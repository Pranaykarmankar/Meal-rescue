# 🍱 Meal Rescue

**Meal Rescue** is a hyper-local marketplace application designed to reduce food waste by connecting consumers with local restaurants, bakeries, and cafés. Merchants can sell their surplus food at the end of the day as heavily discounted "Surprise Boxes", helping the environment while recovering sunk costs, and giving consumers access to high-quality meals at a fraction of the price.

---

## ✨ Key Features

### For Consumers 🧑‍🤝‍🧑
*   **Live Feed:** Browse nearby surplus food listings with real-time inventory updates.
*   **Flash Drops:** Special, highly-discounted boxes dropped at specific times.
*   **QR Code Pickup:** Secure, seamless order handovers using in-app QR code generation.
*   **Streaks & Gamification:** Earn badges and build streaks for consistently rescuing meals.
*   **Favorites:** Save favorite restaurants and get notified when they post a box.

### For Merchants 🏪
*   **Merchant Dashboard:** Track revenue, active boxes, and total meals rescued.
*   **Quick Posting:** Snap a picture and post a surprise box in under 30 seconds.
*   **In-App QR Scanner:** Verify customer orders instantly using the built-in device camera scanner.
*   **Live Analytics:** Monitor sales and customer feedback seamlessly.

### For Admins 👑
*   **System Overview:** Monitor platform-wide analytics, total transactions, and environmental impact (CO2 saved).
*   **User Management:** Oversee consumer and merchant accounts.

---

## 💻 Tech Stack

*   **Backend:** Python 3, FastAPI, SQLAlchemy (Async), Uvicorn
*   **Frontend:** Vanilla JavaScript, HTML5, CSS3 (Mobile-first responsive design)
*   **Database:** MySQL (via aiomysql) / SQLite
*   **Real-time:** WebSockets (for live inventory countdowns)
*   **Containerization:** Docker & Docker Compose

---

## 🚀 Getting Started (Local Development)

### Prerequisites
*   Python 3.10+
*   MySQL Server (Optional, can default to SQLite)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Pranaykarmankar/Meal-rescue.git
   cd Meal-rescue
   ```

2. **Setup the Virtual Environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```

3. **Install Dependencies**
   ```bash
   pip install -r backend/requirements.txt
   ```

4. **Environment Variables**
   Ensure you have a `.env` file inside the `backend` directory:
   ```env
   DATABASE_URL=mysql+aiomysql://root:password@localhost/meal_rescue
   SECRET_KEY=your_super_secret_key
   JWT_ALGORITHM=HS256
   ```

5. **Run the Application**
   ```bash
   cd backend
   uvicorn main:app --reload
   ```
   The application will be available at `http://127.0.0.1:8000`.

---

## 🐳 Docker Deployment (AWS / Production)

The project includes a `Dockerfile` and `docker-compose.yml` for seamless, single-command deployment.

1. **Clone the repository on your server**
   ```bash
   git clone https://github.com/Pranaykarmankar/Meal-rescue.git
   cd Meal-rescue
   ```

2. **Run Docker Compose**
   ```bash
   docker compose up -d --build
   ```

3. **Access the App**
   Navigate to `http://<YOUR_SERVER_IP>:8000`. The MySQL database and FastAPI web server will automatically initialize and connect.

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📝 License
This project is for educational and presentation purposes.
