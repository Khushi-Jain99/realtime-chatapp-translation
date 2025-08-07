import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

function Header({ socket }) {
  const { user } = useSelector((state) => state.userReducer);
  const navigate = useNavigate();

  function getFullname() {
    if (!user) return ""; 
    const fname = user.firstname
      ? user.firstname[0].toUpperCase() + user.firstname.slice(1).toLowerCase(): "";
    const lname = user.lastname
      ? user.lastname[0].toUpperCase() + user.lastname.slice(1).toLowerCase(): "";
    return `${fname} ${lname}`.trim();
  }

  function getInitials() {
    if (!user) return "";
    const f = user.firstname ? user.firstname[0].toUpperCase() : "";
    const l = user.lastname ? user.lastname[0].toUpperCase() : "";
    const initials = `${f}${l}`.trim();
    return initials || "U";
  }

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
    socket.emit('user-logout', user._id);
  }

  return (
    <div className="app-header">
      <div className="app-logo">
        <i className="fa fa-comments" aria-hidden="true"></i> Chat App
      </div>

      <div className="app-user-profile">
        {user?.profilePic ? (
          <img
            src={user.profilePic}
            alt="profile-pic"
            className="logged-user-profile-pic"
            onClick={() => navigate("/profile")}
          />
        ) : (
          <div
            className="logged-user-profile-pic"
            onClick={() => navigate("/profile")}
          >
            {getInitials()}
          </div>
        )}

        <div className="logged-user-name">{getFullname() || "User"}</div>

        <button className="logout-button" onClick={logout}>
          <i className="fa fa-power-off"></i>
        </button>
      </div>
    </div>
  );
}

export default Header;
