require("dotenv").config();
const express = require("express");
const { google } = require("googleapis");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const auth = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET
);

auth.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});

const calendar = google.calendar({ version: "v3", auth });

/* 🔍 Obtener horarios ocupados */
app.get("/busy", async (req, res) => {
  const { start, end } = req.query;

  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: start,
      timeMax: end,
      singleEvents: true,
      orderBy: "startTime",
    });

    const busy = response.data.items.map(e => ({
      start: e.start.dateTime,
      end: e.end.dateTime,
    }));

    res.json(busy);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* 📅 Crear evento */
app.post("/book", async (req, res) => {
  const { name, email, start, end } = req.body;

  try {
    // evitar doble reserva
    const check = await calendar.events.list({
      calendarId: "primary",
      timeMin: start,
      timeMax: end,
      singleEvents: true,
    });

    if (check.data.items.length > 0) {
      return res.json({ success: false, message: "Horario ocupado" });
    }

    const event = {
      summary: `Cita con ${name}`,
      description: `Email: ${email}`,
      start: { dateTime: start },
      end: { dateTime: end },
    };

    await calendar.events.insert({
      calendarId: "primary",
      resource: event,
    });

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Servidor listo en 3000"));
