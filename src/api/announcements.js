import api from "./api";

// User side: the popups this person hasn't dismissed yet.
export const fetchActiveAnnouncements = async () => {
  const res = await api.get("/announcements/active");
  return res.data.announcements || [];
};

export const dismissAnnouncement = (id) => api.post(`/announcements/${id}/dismiss`);

// Admin side (all of these need an administrator session).
export const fetchAnnouncementHistory = async () => {
  const res = await api.get("/admin/announcements");
  return res.data.announcements || [];
};

export const sendAnnouncement = async (payload) => {
  const res = await api.post("/admin/announcements", payload);
  return res.data.announcement;
};

export const updateAnnouncement = async (id, changes) => {
  const res = await api.patch(`/admin/announcements/${id}`, changes);
  return res.data.announcement;
};

export const deleteAnnouncement = (id) => api.delete(`/admin/announcements/${id}`);
