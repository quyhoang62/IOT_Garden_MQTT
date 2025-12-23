import classes from "./navbar.module.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import image from "./LOGO.png";
import {
  faArrowRightFromBracket,
  faUser,
  faHome,
  faMobile,
  faClockRotateLeft,
  faSeedling,
} from "@fortawesome/free-solid-svg-icons";
import { Link, useNavigate, useLocation } from "react-router-dom";

function Navbar({ onLogOut }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogOut = () => {
    onLogOut();
    navigate("/login");
  };

  const menuItems = [
    {
      heading: "HOME",
      link: "/dashboard",
      icon: faHome,
    },
    {
      heading: "CONTROL",
      link: "/control",
      icon: faMobile,
    },
    {
      heading: "GARDEN",
      link: "/garden",
      icon: faSeedling,
    },
    {
      heading: "PROFILE",
      link: "/profile",
      icon: faUser,
    },
    {
      heading: "HISTORY",
      link: "/history",
      icon: faClockRotateLeft,
    },
  ];

  return (
    <div className={classes["navbar"]}>
      <div className={classes["navbar__avt"]}>
        <div className={classes["avt"]}>
          <img src={image} alt="Logo" className={classes["background"]} />
        </div>
      </div>

      <ul className={classes["navbar__list"]}>
        {menuItems.map((item, idx) => (
          <li
            key={`navbar-item-${idx}`}
            className={`${classes["navbar__item"]} ${
              location.pathname === item.link ? classes["active"] : ""
            }`}
          >
            <Link to={item.link} className={classes["navbar__item-link"]}>
              <FontAwesomeIcon
                className={classes["navbar__item-icon"]}
                icon={item.icon}
              />
              {item.heading}
            </Link>
          </li>
        ))}
        <li
          className={`${classes["navbar__item"]} ${classes["logout"]}`}
          onClick={handleLogOut}
        >
          <FontAwesomeIcon
            className={classes["navbar__item-icon"]}
            icon={faArrowRightFromBracket}
          />
          LOG OUT
        </li>
      </ul>
    </div>
  );
}

export default Navbar;
