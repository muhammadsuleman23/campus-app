import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaArrowLeft, FaStar, FaShieldAlt, FaCalendarAlt, FaCommentDots,
  FaBoxOpen, FaLightbulb, FaCar, FaUserFriends, FaCheckCircle, FaPaperPlane,
  FaGift, FaCopy, FaTrophy, FaCamera, FaEdit, FaTrash, FaTimes, FaSave,
} from "react-icons/fa";
import API from "../api";
import { toast } from "react-toastify";
import { gradientFor, initials } from "../utils/avatar";
import Avatar from "../components/Avatar";

const LISTING_META = {
  product: { icon: FaBoxOpen, label: "Marketplace", color: "text-blue-600 bg-blue-50 border-blue-100" },
  skill: { icon: FaLightbulb, label: "Skill Swap", color: "text-purple-600 bg-purple-50 border-purple-100" },
  ride: { icon: FaCar, label: "Ride Share", color: "text-orange-600 bg-orange-50 border-orange-100" },
  roommate: { icon: FaUserFriends, label: "Roommate", color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
};

// Small "earned" badge based on real profile data — no fake stats, just a
// friendly label derived from rating/reviews/trust score already on hand.
function getBadge(profile) {
  if (!profile) return null;
  const { rating = 0, numReviews = 0, trustScore = 100 } = profile;
  if (numReviews >= 3 && rating >= 4.5) return { label: "Top rated", color: "text-amber-800 bg-amber-50 border-amber-200" };
  if (trustScore >= 95 && numReviews === 0) return { label: "New member", color: "text-blue-800 bg-blue-50 border-blue-200" };
  if (trustScore < 60) return { label: "Low trust score", color: "text-red-800 bg-red-50 border-red-200" };
  return null;
}

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [referrals, setReferrals] = useState(null); // { referralCode, count } — own profile only
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  // Editing your own review
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const isOwnProfile = currentUser && String(currentUser._id) === String(id);
  const alreadyReviewed = currentUser && reviews.some((r) => String(r.reviewer?._id) === String(currentUser._id));

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("userInfo"));
    if (!user) { navigate("/"); return; }
    setCurrentUser(user);
    loadProfile();
    // eslint-disable-next-line
  }, [id]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const [{ data: profileData }, { data: reviewData }] = await Promise.all([
        API.get(`/users/${id}`),
        API.get(`/users/${id}/reviews`),
      ]);
      setProfile(profileData);
      setReviews(reviewData);
    } catch (error) {
      toast.error("Couldn't load this profile");
    } finally {
      setLoading(false);
    }

    // Best-effort: pull this person's active listings across modules.
    try {
      const [products, skills, rides, roommates] = await Promise.all([
        API.get("/products").catch(() => ({ data: [] })),
        API.get("/skills").catch(() => ({ data: [] })),
        API.get("/rides").catch(() => ({ data: [] })),
        API.get("/roommates").catch(() => ({ data: [] })),
      ]);
      const mine = [
        ...products.data.filter((p) => String(p.seller?._id) === String(id)).map((p) => ({ type: "product", id: p._id, title: p.title, sub: `Rs. ${p.price}`, path: `/marketplace/${p._id}` })),
        ...skills.data.filter((s) => String(s.user?._id) === String(id)).map((s) => ({ type: "skill", id: s._id, title: s.title, sub: s.category, path: `/skills/${s._id}` })),
        ...rides.data.filter((r) => String(r.driver?._id) === String(id)).map((r) => ({ type: "ride", id: r._id, title: `${r.origin} → ${r.destination}`, sub: r.date ? new Date(r.date).toLocaleDateString() : "", path: `/ride/${r._id}` })),
        ...roommates.data.filter((rm) => String(rm.user?._id) === String(id)).map((rm) => ({ type: "roommate", id: rm._id, title: rm.type, sub: rm.location, path: `/roommates/${rm._id}` })),
      ];
      setListings(mine);
    } catch (e) { /* non-critical */ }

    // Own profile only: referral code + how many friends they've invited.
    const storedUser = JSON.parse(localStorage.getItem("userInfo") || "null");
    if (storedUser && String(storedUser._id) === String(id)) {
      try {
        const { data } = await API.get("/users/me/referrals");
        setReferrals(data);
      } catch (e) { /* non-critical */ }
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (rating === 0) { toast.error("Please pick a star rating"); return; }
    setSubmitting(true);
    try {
      await API.post(`/users/${id}/reviews`, { rating, comment });
      toast.success("Review posted!");
      setRating(0);
      setComment("");
      loadProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMessage = async () => {
    try {
      const { data } = await API.post("/chat", { userId: id });
      navigate("/messages", { state: { chat: data } });
    } catch (error) {
      toast.error("Couldn't start a chat");
    }
  };

  // 📷 Profile picture — convert the chosen file to a base64 data URL (same
  // approach the rest of this app already uses for product/roommate photos)
  // and save it, then refresh localStorage so the navbar avatar updates too.
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image is too large — please use one under 3MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data } = await API.put("/users/me/avatar", { avatar: base64 });
      setProfile((p) => ({ ...p, avatar: data.avatar }));

      // Keep the navbar/chat avatars in sync without needing a fresh login
      const stored = JSON.parse(localStorage.getItem("userInfo") || "null");
      if (stored) {
        stored.avatar = data.avatar;
        localStorage.setItem("userInfo", JSON.stringify(stored));
      }
      toast.success("Profile picture updated!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't upload that photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const startEditReview = (rev) => {
    setEditingReviewId(rev._id);
    setEditRating(rev.rating);
    setEditComment(rev.comment || "");
  };

  const cancelEditReview = () => {
    setEditingReviewId(null);
    setEditRating(0);
    setEditComment("");
  };

  const saveEditReview = async (reviewId) => {
    if (editRating === 0) { toast.error("Please pick a star rating"); return; }
    setSavingEdit(true);
    try {
      await API.put(`/users/reviews/${reviewId}`, { rating: editRating, comment: editComment });
      toast.success("Review updated");
      cancelEditReview();
      loadProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't update review");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteReview = async (reviewId) => {
    if (!window.confirm("Delete your review? This can't be undone.")) return;
    try {
      await API.delete(`/users/reviews/${reviewId}`);
      toast.success("Review deleted");
      loadProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't delete review");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-gray-500 font-medium">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">User not found</p>
        <button onClick={() => navigate(-1)} className="px-5 py-2 rounded-full bg-white border border-gray-200 shadow-sm">Go back</button>
      </div>
    );
  }

  const grad = gradientFor(profile._id);
  const badge = getBadge(profile);
  const memberSince = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "—";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/40 to-blue-50 text-gray-900 font-sans pb-20">
      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-6">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-900 transition px-4 py-2 bg-white shadow-sm rounded-full w-fit">
          <FaArrowLeft /> Back
        </button>

        {/* HERO CARD */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] shadow-xl mb-8">
          <div className={`h-28 md:h-36 bg-gradient-to-r ${grad}`} />
          <div className="bg-white px-6 md:px-10 pb-8">
            <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12 md:-mt-14">
              <div className="relative shrink-0">
                <Avatar
                  userId={profile._id}
                  name={profile.name}
                  avatar={profile.avatar}
                  size="w-24 h-24 md:w-28 md:h-28"
                  textSize="text-3xl md:text-4xl"
                  className="border-4 border-white shadow-lg"
                />
                {isOwnProfile && (
                  <>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      title="Change profile picture"
                      className={`absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-gradient-to-br ${grad} text-white flex items-center justify-center shadow-md border-2 border-white hover:opacity-90 transition disabled:opacity-50`}
                    >
                      {uploadingAvatar ? <span className="text-[10px]">...</span> : <FaCamera size={13} />}
                    </button>
                  </>
                )}
              </div>
              <div className="flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{profile.name}</h1>
                  {profile.isVerified && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                      <FaCheckCircle /> Verified
                    </span>
                  )}
                  {badge && (
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${badge.color}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-sm mt-1 flex items-center gap-1.5"><FaCalendarAlt className="text-gray-400" /> Member since {memberSince}</p>
              </div>
              {!isOwnProfile && (
                <button onClick={handleMessage} className={`px-6 py-3 rounded-2xl bg-gradient-to-r ${grad} text-white font-bold flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition shrink-0`}>
                  <FaCommentDots /> Message
                </button>
              )}
            </div>

            {/* STAT PILLS */}
            <div className="grid grid-cols-3 gap-3 md:gap-4 mt-8">
              <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4 text-center">
                <div className="flex items-center justify-center gap-1 text-yellow-600 font-bold text-xl"><FaStar /> {Number(profile.rating || 0).toFixed(1)}</div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mt-1">{profile.numReviews || 0} Reviews</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
                <div className="flex items-center justify-center gap-1 text-blue-600 font-bold text-xl"><FaShieldAlt /> {profile.trustScore ?? 100}</div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mt-1">Trust Score</p>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 text-center">
                <div className="flex items-center justify-center gap-1 text-purple-600 font-bold text-xl">{listings.length}</div>
                <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mt-1">Active Listings</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* INVITE FRIENDS (own profile only) */}
        {isOwnProfile && referrals && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 rounded-[2rem] p-6 md:p-8 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-xl shrink-0"><FaGift /></div>
              <div>
                <h3 className="font-bold text-gray-900">Invite friends, earn trust score</h3>
                <p className="text-sm text-gray-500">{referrals.count} friend{referrals.count === 1 ? "" : "s"} joined so far · +5 trust score per verified invite</p>
              </div>
            </div>
            <button
              onClick={() => {
                const link = `${window.location.origin}/signup?ref=${referrals.referralCode}`;
                navigator.clipboard.writeText(link);
                toast.success("Invite link copied!");
              }}
              className="px-5 py-2.5 rounded-xl bg-white border border-purple-200 text-purple-700 font-bold text-sm flex items-center gap-2 hover:bg-purple-50 transition shrink-0"
            >
              <FaCopy /> Copy invite link
            </button>
          </motion.div>
        )}

        {/* LISTINGS */}
        {listings.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 md:p-8 mb-8">
            <h3 className="text-xl font-bold mb-5">Active Listings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {listings.map((item) => {
                const meta = LISTING_META[item.type];
                const Icon = meta.icon;
                return (
                  <div key={`${item.type}-${item.id}`} onClick={() => navigate(item.path)} className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer hover:shadow-md transition ${meta.color}`}>
                    <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center text-lg shrink-0"><Icon /></div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs opacity-80 truncate">{meta.label}{item.sub ? ` · ${item.sub}` : ""}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* REVIEWS */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 md:p-8">
          <h3 className="text-xl font-bold mb-5">Reviews</h3>

          {reviews.length === 0 ? (
            <p className="text-gray-500 mb-6">No reviews yet{isOwnProfile ? "" : " — be the first to leave one!"}</p>
          ) : (
            <div className="space-y-4 mb-8">
              {reviews.map((rev) => {
                const isMine = currentUser && String(rev.reviewer?._id) === String(currentUser._id);
                const isEditing = editingReviewId === rev._id;
                return (
                  <div key={rev._id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <Avatar userId={rev.reviewer?._id} name={rev.reviewer?.name} avatar={rev.reviewer?.avatar} size="w-9 h-9" textSize="text-xs" />
                        <div>
                          <strong className="text-gray-900 block leading-tight">{rev.reviewer?.name || "Anonymous"}{isMine && <span className="text-[10px] text-purple-500 font-semibold ml-1.5">(You)</span>}</strong>
                          <span className="text-[11px] text-gray-400">{rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : ""}</span>
                        </div>
                      </div>
                      {!isEditing && (
                        <div className="flex items-center gap-1 shrink-0">
                          <div className="flex text-yellow-500 text-sm">
                            {[...Array(5)].map((_, i) => <FaStar key={i} className={i < rev.rating ? "opacity-100" : "opacity-20"} />)}
                          </div>
                          {isMine && (
                            <>
                              <button onClick={() => startEditReview(rev)} title="Edit review" className="ml-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-full transition"><FaEdit size={12} /></button>
                              <button onClick={() => deleteReview(rev._id)} title="Delete review" className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-full transition"><FaTrash size={12} /></button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="pl-12">
                        <div className="flex gap-1.5 mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <FaStar key={star} className={`cursor-pointer text-xl transition ${editRating >= star ? "text-yellow-500" : "text-gray-300"}`} onClick={() => setEditRating(star)} />
                          ))}
                        </div>
                        <textarea className="w-full bg-white border border-gray-200 p-2.5 rounded-xl text-gray-900 text-sm outline-none focus:border-purple-400 mb-2" rows="2" value={editComment} onChange={(e) => setEditComment(e.target.value)} />
                        <div className="flex gap-2">
                          <button onClick={() => saveEditReview(rev._id)} disabled={savingEdit} className="flex items-center gap-1.5 text-xs font-bold bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition disabled:opacity-50">
                            <FaSave size={11} /> {savingEdit ? "Saving..." : "Save"}
                          </button>
                          <button onClick={cancelEditReview} className="flex items-center gap-1.5 text-xs font-bold bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition">
                            <FaTimes size={11} /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      rev.comment && <p className="text-gray-600 text-sm pl-12">{rev.comment}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!isOwnProfile && !alreadyReviewed && (
            <form onSubmit={submitReview} className="bg-gradient-to-br from-gray-50 to-purple-50/50 p-6 rounded-2xl border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold">Write a Review</h4>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <FaShieldAlt size={10} /> Verified reviews only
                </span>
              </div>
              <div className="flex gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FaStar key={star} className={`cursor-pointer text-2xl transition ${rating >= star ? "text-yellow-500" : "text-gray-300"}`} onClick={() => setRating(star)} />
                ))}
              </div>
              <textarea className="w-full bg-white border border-gray-200 p-3 rounded-xl text-gray-900 outline-none focus:border-purple-400 mb-3" rows="3" placeholder="Share your experience with this person..." value={comment} onChange={(e) => setComment(e.target.value)} />
              <p className="text-[11px] text-gray-400 mb-4">You can only review people you've actually messaged — this keeps reviews real.</p>
              <button type="submit" disabled={submitting} className={`bg-gradient-to-r ${grad} text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition disabled:opacity-50`}>
                <FaPaperPlane /> {submitting ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          )}

          {!isOwnProfile && alreadyReviewed && (
            <p className="text-sm text-emerald-600 font-medium flex items-center gap-2"><FaCheckCircle /> You've already reviewed this user.</p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
