import React, { Fragment, useEffect, useState } from "react";
import SideBar from "./SideBar";
import NavHader from "./NavHader";
import Header from "./Header";
import ChatBox from "../ChatBox";
import { useAuthUser } from "react-auth-kit";
import { useNavigate } from "react-router-dom";
import "./user-portal-theme.css";

const JobieNav = ({ title, onClick: ClickToAddEvent }) => {
  const [toggle, setToggle] = useState("");
  const onClick = (name) => setToggle(toggle === name ? "" : name);
  const authUser = useAuthUser();
  const Navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.add("user-portal-theme");
    return () => {
      document.documentElement.classList.remove("user-portal-theme");
    };
  }, []);

  useEffect(() => {
    const role = authUser()?.user?.role;
    if (role === "user") {
      return;
    } else if (role === "admin" || role === "subadmin") {
      Navigate("/admin/dashboard");
      return;
    }
  }, []);

  return (
    <Fragment>
      <NavHader />
      <ChatBox onClick={() => onClick("chatbox")} toggle={toggle} />
      <Header
        onNote={() => onClick("chatbox")}
        onNotification={() => onClick("notification")}
        onProfile={() => onClick("profile")}
        toggle={toggle}
        title={title}
        onBox={() => onClick("box")}
        onClick={() => ClickToAddEvent && ClickToAddEvent()}
      />
      <SideBar />
    </Fragment>
  );
};

export default JobieNav;
