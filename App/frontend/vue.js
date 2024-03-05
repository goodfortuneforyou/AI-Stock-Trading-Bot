Vue.createApp({
  data: function () {
    return {
      users: [
        {
          name: "Anjolie",
          birthday: "1999-01-01",
          email: "anjolie@gmail.com",
          password: "123",
          phone: "111-111-1111",
        },
      ],
      errorMessages: {},
      newUserName: "",
      newUserBirthday: "",
      newUserEmail: "",
      newUserPassword: "",
      newDestination: "",
      newInterest: "",
      returningUserEmail: "",
      returningUserPassword: "",
      userInfo: {},
      userInfoName: "",
      userInfoBirthday: "",
      userInfoEmail: "",
    };
  },
  methods: {
    addUser: function () {
      if (!this.isNewUserValid()) return;
      var data = "name=" + encodeURIComponent(this.newUserName);
      data += "&birthday=" + encodeURIComponent(this.newUserBirthday);
      data += "&email=" + encodeURIComponent(this.newUserEmail);
      data += "&password=" + encodeURIComponent(this.newUserPassword);
      data += "&phone=" + encodeURIComponent(this.newUserPhone);
      console.log("data: ", data);
      const requestOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: data,
      };
      fetch("/users", requestOptions).then((response) => {
        if (response.status == 201) {
          this.loadUsersCollection();
          console.log("user added.");
          //hide the sign up screen
          this.newUserName = "";
          this.newUserBirthday = "";
          this.newUserEmail = "";
          this.newUserPassword = "";
          this.newUserPhone = "";
          this.displayLogin();
        }
      });
    },

    loginUser: function () {
      if (!this.validateReturningUserInputs()) return;
      var data = "email=" + encodeURIComponent(this.returningUserEmail);
      data += "&password=" + encodeURIComponent(this.returningUserPassword);
      console.log("data: ", data);
      requestOptions = {
        method: "GET",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: data,
      };
      fetch("/login", requestOptions)
        .then((response) => {
          if (response.status === 200) {
            response.json().then((data) => {
              console.log("User ID:", data.userId);
              localStorage.setItem("userId", data.userId);
              this.loadUserInfo();
              fetch(`/users/${data.userId}/destinations`)
                .then((response) => response.json())
                .then((destinations) => {
                  this.destinations = destinations;
                });
              fetch(`/users/${data.userId}/interests`)
                .then((response) => response.json())
                .then((interests) => {
                  this.interests = interests;
                });
            });
            this.displayHomePage();
          } else {
            this.errorMessages.login = "Invalid email or password";
          }
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    },

    loadUsersCollection: function () {
      fetch("/users").then((response) => {
        if (response.status == 200) {
          response.json().then((UserssFromServer) => {
            this.users = UserssFromServer;
            console.log("users: ", this.users);
          });
        }
      });
    },

    loadUser: function (id) {
      fetch("/users/" + id).then((response) => {
        if (response.status == 200) {
          response.json().then((user) => {
            this.user = user;
            console.log("user: ", this.user);
          });
        }
      });
    },

    updateUserInformation: function () {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        console.error("User ID not found in local storage");
        return;
      }
      const userData = {
        name: this.userInfoName,
        birthday: this.userInfoBirthday,
        email: this.userInfoEmail,
      };
      console.log("userData: ", userData);
      fetch(`/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      })
        .then((response) => {
          if (response.ok) {
            console.log("User information updated successfully");
            this.userInfo.name = userData.name;
            this.userInfo.birthday = userData.birthday;
            this.userInfo.email = userData.email;

            this.userInfoName = "";
            this.userInfoBirthday = "";
            this.userInfoEmail = "";

            var newUserHomePage = document.getElementById("edit-info");
            newUserHomePage.style = "display:none";
            var returningUserHomePage = document.getElementById("user-info");
            returningUserHomePage.style = "display:grid";
          } else {
            console.error(
              "Failed to update user information:",
              response.statusText
            );
          }
        })
        .catch((error) => {
          console.error("Error updating user information:", error);
        });
    },

    displayHomePage: function () {
      var returningUserHomePage = document.getElementById("LoginBox");
      returningUserHomePage.style = "display:none";
      var homePage = document.getElementById("homePage");
      homePage.style = "display:grid";
    },

    displayLogin: function () {
      errorMessages = {};
      var newUserHomePage = document.getElementById("new-user-inputs");
      newUserHomePage.style = "display:none";
      var returningUserHomePage = document.getElementById(
        "returning-user-inputs"
      );
      returningUserHomePage.style = "display:grid";
      this.returningUserEmail = "";
      this.returningUserPassword = "";
    },

    signOut: function () {
      var homePage = document.getElementById("homePage");
      homePage.style = "display:none";
      var newUserHomePage = document.getElementById("new-user-inputs");
      newUserHomePage.style = "display: grid";
      var returningUserHomePage = document.getElementById(
        "returning-user-inputs"
      );
      returningUserHomePage.style = "display:none";
      var returningUserHomePage = document.getElementById("LoginBox");
      returningUserHomePage.style = "display:inline-flex";

      this.newUserPassword = "";
      this.newUserEmail = "";
      this.newUserName = "";
      this.newUserBirthday = "";
    },
  },
  created: function () {
    console.log("Hello, vue.");
  },
}).mount("#app");
