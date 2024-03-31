Vue.createApp({
  data: function () {
    return {
      users: [
        {
          id: 1,
          name: "Anjolie",
          birthday: "2001-10-19",
          email: "anjoliekatecummins@gmail.com",
          password: "1234",
          investments: [
            {
              stock_symbol: "AAPL",
              quantity: 1,
              price: 5,
              transaction_type: "sell",
              timestamp: "2021-10-19T12:00:00",
            },
          ],
          preferences: {
            symbols: ["AAPL", "GOOGL", "AMZN"],
            investment_amount: 10,
          },
        },
      ],
      preferences: [],
      investments: [],
      errorMessages: {},
      newUserName: "",
      newUserEmail: "",
      newUserPassword: "",
      newPreference: "",
      newInvestment: "",
      returningUserEmail: "",
      returningUserPassword: "",
      userInfo: {},
      userInfoName: "",
      userInfoEmail: "",
    };
  },

  methods: {
    loadUserInfo: function () {
      const userId = localStorage.getItem("userId");
      fetch(`/users/${userId}`, userId)
        .then((response) => response.json())
        .then((userData) => {
          console.log("User Info:", userData);
          this.userInfo = userData;
        })
        .catch((error) => {
          console.error("Error fetching user info:", error);
        });
    },

    validateReturningUserInputs: function () {
      this.errorMessages = {};
      if (
        this.returningUserEmail == undefined ||
        this.returningUserEmail == ""
      ) {
        this.errorMessages["user.email"] = "Email is required.";
      }
      if (
        this.returningUserPassword == undefined ||
        this.returningUserPassword == ""
      ) {
        this.errorMessages["user.password"] = "Password is required.";
      }
      return Object.keys(this.errorMessages).length == 0;
    },

    isNewUserValid: function () {
      this.errorMessages = {};
      if (this.newUserName == undefined || this.newUserName == "") {
        this.errorMessages["user.name"] = "Name is required.";
      }
      if (!this.isEmailValid(this.newUserEmail)) {
        this.errorMessages["user.email"] = "Email is invalid.";
      }
      if (
        this.newUserPassword == undefined ||
        this.newUserPassword.length < 8
      ) {
        this.errorMessages["user.password"] =
          "Password must be at least 8 characters.";
      }
      console.log(Object.keys(this.errorMessages).length);
      return Object.keys(this.errorMessages).length == 0;
    },

    addUser: function () {
      if (!this.isNewUserValid()) return;
      var data = "name=" + encodeURIComponent(this.newUserName);
      data += "&email=" + encodeURIComponent(this.newUserEmail);
      data += "&password=" + encodeURIComponent(this.newUserPassword);
      console.log("data: ", data);
      const requestOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: data,
      };
      fetch("/users/signup", requestOptions).then((response) => {
        if (response.status == 201) {
          this.loadUsersCollection();
          console.log("user added.");
          this.newUserName = "";
          this.newUserEmail = "";
          this.newUserPassword = "";
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
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: data,
      };
      fetch("/users/login", requestOptions)
        .then((response) => {
          if (response.status === 201) {
            response.json().then((data) => {
              console.log("User ID:", data.userId);
              localStorage.setItem("userId", data.userId);
              this.loadUserInfo();
              fetch(`/users/${data.userId}/investments`)
                .then((response) => response.json())
                .then((investments) => {
                  this.investments = investments;
                });
              fetch(`/users/${data.userId}/preferences`)
                .then((response) => response.json())
                .then((preferences) => {
                  this.preferences = preferences;
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

    isEmailValid: function (email) {
      return String(email)
        .toLowerCase()
        .match(
          /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
    },

    loadUsersCollection: function () {
      fetch("/users").then((response) => {
        if (response.status == 200) {
          response.json().then((users) => {
            console.log("recieved users from API: ", users);
            this.users = users;
          });
        }
      });
    },

    loadUserInvestments: function (userId) {
      fetch(`/users/${userId}/investments`)
        .then((response) => response.json())
        .then((investments) => {
          console.log("User investments:", investments);
        })
        .catch((error) => {
          console.error("Error fetching investments:", error);
        });
    },

    loadUserPreferences: function (userId) {
      fetch(`/users/${userId}/preferences`)
        .then((response) => response.json())
        .then((preferences) => {
          console.log("User preferences:", preferences);
        })
        .catch((error) => {
          console.error("Error fetching preferences:", error);
        });
    },

    displayInput: function () {
      const userId = localStorage.getItem("userId");
      var newUserHomePage = document.getElementById("user-info");
      newUserHomePage.style = "display:none";
      var returningUserHomePage = document.getElementById("edit-info");
      returningUserHomePage.style = "display:grid";
      fetch(`/users/${userId}`)
        .then((response) => response.json())
        .then((userData) => {
          console.log("User Info:", userData);
          this.userInfo = userData;
          this.userInfoName = this.userInfo.name;
          this.userInfoEmail = this.userInfo.email;

          document.getElementById("nameInput").value = this.userInfoName;
          document.getElementById("emailInput").value = this.userInfoEmail;
        });
    },

    updateUserInformation: function () {
      const userId = localStorage.getItem("userId");
      const userData = {
        name: this.userInfoName,
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
            this.userInfo.email = userData.email;

            this.userInfoName = "";
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

    addInvestment: function () {
      const userId = localStorage.getItem("userId");
      const data = "investment=" + encodeURIComponent(this.newInvestment);
      const requestOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: data,
      };
      fetch(`/users/${userId}/investments`, requestOptions)
        .then((response) => {
          if (response.status === 201) {
            console.log("Investment added successfully");
            this.loadUserInvestments(userId);
            fetch(`/users/${userId}/investments`)
              .then((response) => response.json())
              .then((investments) => {
                this.investments = investments;
                this.newInvestment = "";
              });
          } else {
            console.error("Failed to add investment:", response.statusText);
          }
        })
        .catch((error) => {
          console.error("Error adding investment:", error);
        });
    },

    removeInvestment: function (investment) {
      if (confirm("Are you sure you want to remove this investment?")) {
        const userId = localStorage.getItem("userId");
        const requestOptions = {
          method: "DELETE",
        };
        fetch(`/users/${userId}/investments/${investment}`, requestOptions)
          .then((response) => {
            if (response.status === 204) {
              console.log("investment removed successfully");
              this.loadUserInvestments(userId);
              fetch(`/users/${userId}/investments`)
                .then((response) => response.json())
                .then((investments) => {
                  this.investments = investments;
                });
            } else {
              console.error(
                "Failed to remove investment:",
                response.statusText
              );
            }
          })
          .catch((error) => {
            console.error("Error removing investment:", error);
          });
      }
    },

    addPreference: function () {
      const userId = localStorage.getItem("userId");
      const data = "preference=" + encodeURIComponent(this.newPreference);
      const requestOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: data,
      };
      fetch(`/users/${userId}/preferences`, requestOptions)
        .then((response) => {
          if (response.status === 201) {
            console.log("preference added successfully");
            this.loadUserPreferences(userId);
            fetch(`/users/${userId}/preferences`)
              .then((response) => response.json())
              .then((preferences) => {
                this.preferences = preferences;
                this.newpreference = "";
              });
          } else {
            console.error("Failed to add preference:", response.statusText);
          }
        })
        .catch((error) => {
          console.error("Error adding preference:", error);
        });
    },

    removePreference: function (preference) {
      if (confirm("Are you sure you want to remove this preference?")) {
        const userId = localStorage.getItem("userId");
        if (!userId) {
          console.error("User ID not found in local storage");
          return;
        }
        const requestOptions = {
          method: "DELETE",
        };
        fetch(`/users/${userId}/preferences/${preference}`, requestOptions)
          .then((response) => {
            if (response.status === 204) {
              console.log("preference removed successfully");
              this.loadUserPreferences(userId);
              fetch(`/users/${userId}/preferences`)
                .then((response) => response.json())
                .then((preferences) => {
                  this.preferences = preferences;
                });
            } else {
              console.error(
                "Failed to remove preference:",
                response.statusText
              );
            }
          })
          .catch((error) => {
            console.error("Error removing preference:", error);
          });
      }
    },

    errorMessageForField: function (fieldName) {
      return this.errorMessages[fieldName];
    },

    errorStyleForField: function (fieldName) {
      if (this.errorMessageForField(fieldName)) {
        return { border: "1px solid red" };
      } else {
        return {};
      }
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
    },

    loadingPage: function () {
      document.addEventListener("readystatechange", (event) => {
        if (event.target.readyState === "loading") {
          document.getElementById("socket").style.display = "block";
        } else if (event.target.readyState === "complete") {
          document.getElementById("socket").style.display = "none";
        }
      });
    },
  },

  computed: {
    validationErrors: function () {
      return Object.keys(this.errorMessages).length > 0;
    },
  },

  created: function () {
    console.log("Hello, vue.");
    this.loadUserInfo();
  },
}).mount("#app");
