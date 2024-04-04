Vue.createApp({
  // data, methods, and created are elements of the Vue app.
  // data is a function that returns an object that represents all data in app
  data: function () {
    return {
      errorMessages: {},
      newUserName: "",
      newUserBirthday: "",
      newUserEmail: "",
      newUserPassword: "",
      returningUserEmail: "",
      returningUserPassword: "",
      userInfo: {},
      userInfoName: "",
      userInfoBirthday: "",
      userInfoEmail: "",
    };
  },

  // object with more keys inside it.
  methods: {
    loadUserInfo: function () {
      fetch("session", { credentials: "include" })
        .then((response) => response.json())
        .then((userData) => {
          console.log("User Info:", userData);
          this.userInfo = userData;
          this.loadUserTransactions();
          this.loadUserInterests();
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

      let birthDate = new Date(this.newUserBirthday);
      if (birthDate == "Invalid Date") {
        this.errorMessages["user.birthday"] = "Birthday is invalid.";
      } else {
        this.newUserBirthday = birthDate.toISOString().split("T")[0];
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
      const requestOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Methods": "POST",
        },
        credentials: "include",
        body: JSON.stringify({
          name: this.newUserName,
          birthday: this.newUserBirthday,
          email: this.newUserEmail,
          password: this.newUserPassword,
        }),
      };
      fetch("http://localhost:5000/users", requestOptions).then((response) => {
        if (response.status == 201) {
          console.log("user added.");
          //hide the sign up screen
          this.newUserName = "";
          this.newUserBirthday = "";
          this.newUserEmail = "";
          this.newUserPassword = "";
          this.displayLogin();
        }
      });
    },

    logoutUser: function () {
      if (!this.validateReturningUserInputs()) return;
      fetch("http://localhost:5000/session", {
        method: "DELETE",
        credentials: "include",
      })
        .then((response) => {
          if (response.status === 200) {
            this.signOut();
          } else {
            console.error("Failed to logout:", response.statusText);
          }
        })
        .catch((error) => {
          console.error("Error logging out:", error);
        });
    },

    loginUser: function () {
      // if (!this.validateReturningUserInputs()) return;
      requestOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: this.returningUserEmail,
          password: this.returningUserPassword,
        }),
      };
      fetch("http://localhost:5000/session", requestOptions).then(
        (response) => {
          if (response.status == 201) {
            this.displayHomePage();
          } else {
            this.errorMessages.login = "Invalid email or password.";
          }
        }
      );
    },

    isEmailValid: function (email) {
      return String(email)
        .toLowerCase()
        .match(
          /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
    },

    loadUserSymbols: function () {
      this.symbols = this.userInfo.symbols;
    },

    loadUserTransactions: function () {
      this.transactions = this.userInfo.transactions;
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
      this.loadUserInfo();
      this.loadUserTransactions();
      this.loadUserSymbols();
      window.location.href = "dashboard.html";
    },

    displayLogin: function () {
      window.location.href = "login.html";
    },

    signOut: function () {
      this.userInfo = {};
      this.symbols = [];
      this.transactions = [];

      window.location.href = "signup.html";
    },
  },

  computed: {
    validationErrors: function () {
      return Object.keys(this.errorMessages).length > 0;
    },
  },

  created: function () {
    fetch("http://localhost:5000/session", {
      method: "GET",
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.user) {
          this.userInfo = data.user;
          this.displayHomePage();
        }
      })
      .catch((error) => console.error("Error:", error));
  },

  // IDs and classes only meant for css purposes shouldn't have to query them for js or for automated behaviour tests
  // created is a function that gets called once when it loads
  // this is like self in python. this.data_attribute or this.method_name
  // v-on establishes an event listener its a directive, data binding, rendering
  created: function () {
    console.log("Hello, vue.");
  },
}).mount("#app");
