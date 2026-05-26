const router = require('express').Router();
const { pool } = require('../db');
const { auth } = require('../middleware/auth');

// GET /api/chat/conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END AS other_id,
        m.job_id,
        u.name  AS other_name,
        j.title AS job_title,
        (SELECT content    FROM messages m2
          WHERE ((m2.sender_id=$1 AND m2.receiver_id=CASE WHEN m.sender_id=$1 THEN m.receiver_id ELSE m.sender_id END)
              OR (m2.receiver_id=$1 AND m2.sender_id=CASE WHEN m.sender_id=$1 THEN m.receiver_id ELSE m.sender_id END))
            AND (m2.job_id = m.job_id OR (m2.job_id IS NULL AND m.job_id IS NULL))
          ORDER BY m2.created_at DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM messages m2
          WHERE ((m2.sender_id=$1 AND m2.receiver_id=CASE WHEN m.sender_id=$1 THEN m.receiver_id ELSE m.sender_id END)
              OR (m2.receiver_id=$1 AND m2.sender_id=CASE WHEN m.sender_id=$1 THEN m.receiver_id ELSE m.sender_id END))
            AND (m2.job_id = m.job_id OR (m2.job_id IS NULL AND m.job_id IS NULL))
          ORDER BY m2.created_at DESC LIMIT 1) AS last_at,
        (SELECT COUNT(*) FROM messages m2
          WHERE m2.receiver_id=$1 AND m2.read=FALSE
            AND m2.sender_id=CASE WHEN m.sender_id=$1 THEN m.receiver_id ELSE m.sender_id END
            AND (m2.job_id = m.job_id OR (m2.job_id IS NULL AND m.job_id IS NULL))) AS unread
      FROM messages m
      JOIN users u ON u.id = CASE WHEN m.sender_id=$1 THEN m.receiver_id ELSE m.sender_id END
      LEFT JOIN jobs j ON j.id = m.job_id
      WHERE m.sender_id=$1 OR m.receiver_id=$1
      GROUP BY other_id, m.job_id, u.name, j.title
      ORDER BY last_at DESC NULLS LAST
    `, [req.user.id]);

    const totalUnread = rows.reduce((s, r) => s + parseInt(r.unread || 0), 0);
    res.json({ ok: true, conversations: rows, totalUnread });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load conversations' });
  }
});

// GET /api/chat/:userId/:jobId — messages in a thread
router.get('/:userId/:jobId', auth, async (req, res) => {
  try {
    const other = parseInt(req.params.userId);
    const jobId = req.params.jobId === 'null' ? null : parseInt(req.params.jobId);

    const { rows } = await pool.query(`
      SELECT m.*, u.name AS sender_name
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE ((m.sender_id=$1 AND m.receiver_id=$2) OR (m.sender_id=$2 AND m.receiver_id=$1))
        AND ($3::INTEGER IS NULL OR m.job_id=$3)
      ORDER BY m.created_at ASC
    `, [req.user.id, other, jobId]);

    // Mark received messages as read
    await pool.query(`
      UPDATE messages SET read=TRUE
      WHERE receiver_id=$1 AND sender_id=$2
        AND ($3::INTEGER IS NULL OR job_id=$3) AND read=FALSE
    `, [req.user.id, other, jobId]);

    res.json({ ok: true, messages: rows });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to load messages' });
  }
});

// POST /api/chat/:userId/:jobId — send a message
router.post('/:userId/:jobId', auth, async (req, res) => {
  try {
    const receiver = parseInt(req.params.userId);
    const jobId    = req.params.jobId === 'null' ? null : parseInt(req.params.jobId);
    const { content } = req.body;

    if (!content?.trim()) return res.json({ ok: false, error: 'Message cannot be empty' });
    if (content.trim().length > 1000) return res.json({ ok: false, error: 'Message too long (max 1000 characters)' });
    if (receiver === req.user.id) return res.json({ ok: false, error: 'Cannot message yourself' });

    // Bug #3 fix: verify the receiver exists and is active before inserting.
    // Without this, messages are silently written to deleted/suspended/ghost
    // user IDs and the sender never finds out.
    if (!Number.isInteger(receiver) || receiver <= 0) {
      return res.json({ ok: false, error: 'Invalid recipient.' });
    }
    const { rows: receiverRows } = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND active = true LIMIT 1',
      [receiver]
    );
    if (!receiverRows.length) {
      return res.json({ ok: false, error: 'Recipient not found or unavailable.' });
    }

    const { rows } = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, job_id, content)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, receiver, jobId, content.trim()]
    );
    res.json({ ok: true, message: rows[0] });
  } catch (err) {
    console.error(err);
    res.json({ ok: false, error: 'Failed to send message' });
  }
});

module.exports = router;
