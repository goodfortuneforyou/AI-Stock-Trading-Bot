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
      chartData: [],
      current_return: "",
      current_port_value: "",
      transactions: [],
      symbols: ["AAPL", "GOOGL", "AMZN", "TSLA", "NFLX", "NVDA", "SPY"],
      backgroundColor: "rgba(97, 102, 97, 0.45)",
      selectedSymbol: "",
      amount: 0,
      stockPercent: 0,
      userSymbols: [],
      positiveNews: [],
    };
  },

  methods: {
    // fetch the session data and load the users information accordingly
    loadUserInfo: function () {
      fetch("http://localhost:5000/session", {
        method: "GET",
        credentials: "include",
      })
        .then((response) => response.json())
        .then((userData) => {
          console.log("User Info:", userData);
          this.userInfo = userData.user;
        });
    },

    //make sure the emaila and password are not empty
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

    //make sure the inputs are not empty, birthday is valid date, the email has *@*.*, and the password is at least 8 characters
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
      //check if the inputs are valid
      if (!this.isNewUserValid()) return;
      const requestOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Methods": "POST",
        },
        credentials: "include",
        //send input values to the server
        body: JSON.stringify({
          name: this.newUserName,
          birthday: this.newUserBirthday,
          email: this.newUserEmail,
          password: this.newUserPassword,
          symbols: {},
        }),
      };
      fetch("http://localhost:5000/users", requestOptions).then((response) => {
        if (response.status == 201) {
          console.log("user added.");
          //clear the input fields and display the login page
          this.newUserName = "";
          this.newUserBirthday = "";
          this.newUserEmail = "";
          this.newUserPassword = "";
          this.displayLogin();
        }
      });
    },

    loginUser: async function () {
      //check if the inputs are valid
      if (!this.validateReturningUserInputs()) return;
      const requestOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        //send input values to the server
        body: JSON.stringify({
          email: this.returningUserEmail,
          password: this.returningUserPassword,
        }),
      };
      const response = await fetch(
        "http://localhost:5000/session",
        requestOptions
      );
      if (response.status == 201) {
        const userData = await response.json();
        this.userInfo = userData.user;
        if (userData.message == "First login") {
          //if the user is logging in for the first time, display the new user form
          this.displayNewUserForm();
        } else if (userData.message == "Authenticated") {
          //if the user is authenticated, display the home page and run the bot
          const botResponse = await fetch(
            "http://localhost:5000/run_trading_bot",
            {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Methods": "POST",
              },
            }
          );
          //alert the user that the bot is running and may take some time
          alert(
            "Welcome back, " +
              this.userInfo.name +
              "!. Please wait while our bot processes your data and loads your portfolio"
          );
          if (botResponse.status === 200) {
            console.log("Bot is running.");
          } else {
            console.error("Failed to run bot:", botResponse.statusText);
          }
          this.displayHomePage();
        }
        //load the user's information
        this.loadTransactions();
        this.loadChartData();
        this.loadPositiveNews();
      } else {
        this.errorMessages.login = "Invalid email or password.";
      }
    },

    //use regex to check if the email is valid
    isEmailValid: function (email) {
      return String(email)
        .toLowerCase()
        .match(
          /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
    },

    errorMessageForField: function (fieldName) {
      return this.errorMessages[fieldName];
    },

    addSymbol: function () {
      console.log("Adding symbol:", this.selectedSymbol);
      const requestOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Methods": "POST",
        },
        credentials: "include",
        body: JSON.stringify({
          //send the selected symbol and amount to the server
          symbols: { symbol: this.selectedSymbol, amount: this.amount },
        }),
      };
      fetch(`http://localhost:5000/symbols`, requestOptions)
        .then((response) => {
          if (response.status === 201) {
            //if added clear fields and load the user's information
            console.log("Symbol added successfully");
            this.loadUserInfo();
            this.selectedSymbol = "";
            this.amount = 0;
            this.displayHomePage();
          } else {
            console.error("Failed to add symbol:", response.statusText);
          }
        })
        .catch((error) => {
          console.error("Error adding symbol:", error);
        });
    },

    errorStyleForField: function (fieldName) {
      if (this.errorMessageForField(fieldName)) {
        return { border: "1px solid red" };
      } else {
        return {};
      }
    },

    //since this is a single page application, we use the display functions to show the user the correct page
    displayHomePage: function () {
      this.loadUserInfo();
      var home = document.getElementById("dashboard_html");
      var signup = document.getElementById("signup_html");
      var login = document.getElementById("login_html");
      var new_user = document.getElementById("new_user_html");
      var reports = document.getElementById("reports-container");
      var preferences = document.getElementById("preferences-container");
      reports.style = "display:none";
      home.style = "display:block";
      login.style = "display:none";
      signup.style = "display:none";
      new_user.style = "display:none";
      preferences.style = "display:none";
      document.body.style.background = "black";
    },

    displayLogin: function () {
      var login = document.getElementById("login_html");
      var signup = document.getElementById("signup_html");
      var preferences = document.getElementById("preferences-container");
      var reports = document.getElementById("reports-container");
      var transactions = document.getElementById("transactions-container");
      reports.style = "display:none";
      transactions.style = "display:none";
      preferences.style = "display:none";
      login.style = "display:block";
      signup.style = "display:none";
    },

    displayNewUserForm: function () {
      var form = document.getElementById("new_user_html");
      var login = document.getElementById("login_html");
      form.style = "display:block";
      login.style = "display:none";
    },

    displayReports: function () {
      var reports = document.getElementById("reports-container");
      var dashboard = document.getElementById("dashboard_html");
      var transactions = document.getElementById("transactions-container");
      var preferences = document.getElementById("preferences-container");
      preferences.style = "display:none";
      transactions.style = "display:none";
      reports.style = "display:block";
      dashboard.style = "display:none";
    },

    displayPreferences: function () {
      var reports = document.getElementById("reports-container");
      var transactions = document.getElementById("transactions-container");
      var dashboard = document.getElementById("dashboard_html");
      var preferences = document.getElementById("preferences-container");
      dashboard.style = "display:none";
      reports.style = "display:none";
      transactions.style = "display:none";
      preferences.style = "display:block";
    },

    displayTransactions: function () {
      var reports = document.getElementById("reports-container");
      var dashboard = document.getElementById("dashboard_html");
      var transactions = document.getElementById("transactions-container");
      var preferences = document.getElementById("preferences-container");
      preferences.style = "display:none";
      reports.style = "display:none";
      transactions.style = "display:block";
      dashboard.style = "display:none";
    },

    displayInput: function () {
      var newUserHomePage = document.getElementById("user-info");
      newUserHomePage.style = "display:none";
      var returningUserHomePage = document.getElementById("edit-info");
      returningUserHomePage.style = "display:grid";
      this.userInfoName = this.userInfo.name;
      this.userInfoBirthday = this.userInfo.birthday;
      this.userInfoEmail = this.userInfo.email;
      document.getElementById("nameInput").value = this.userInfoName;
      document.getElementById("birthdayInput").value = this.userInfoBirthday;
      document.getElementById("emailInput").value = this.userInfoEmail;
    },

    updateUserInformation: function () {
      const userData = {
        name: this.userInfoName,
        birthday: this.userInfoBirthday,
        email: this.userInfoEmail,
      };
      console.log("userData: ", userData);
      fetch(`http://localhost:5000/users`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Methods": "PUT",
        },
        credentials: "include",
        //send the updated user information to the server
        body: JSON.stringify(userData),
      })
        .then((response) => {
          if (response.ok) {
            //if the user information is updated successfully, update the user information and display the user's home page
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

    removeSymbol: function (symbol) {
      console.log("Removing symbol:", symbol);
      const requestOptions = {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Methods": "DELETE",
        },
        credentials: "include",
        //send the symbol we want to remove, essentially like withdrawing money from the account
        body: JSON.stringify({
          symbol: symbol,
        }),
      };
      fetch(`http://localhost:5000/symbols`, requestOptions)
        .then((response) => {
          if (response.status === 204) {
            console.log("Symbol removed successfully");
            // reload info if successful
            this.loadUserInfo();
          } else {
            console.error("Failed to remove symbol:", response.statusText);
          }
        })
        .catch((error) => {
          console.error("Error removing symbol:", error);
        });
    },

    signOut: function () {
      // clear all the data and display the signup page
      this.userInfo = {};
      this.transactions = [];
      this.userSymbols = [];
      this.chartData = [];
      this.positiveNews = [];
      this.current_return = "";
      this.current_port_value = "";
      var home = document.getElementById("dashboard_html");
      var signup = document.getElementById("signup_html");
      var login = document.getElementById("login_html");
      var preferences = document.getElementById("preferences-container");
      var reports = document.getElementById("reports-container");
      var transactions = document.getElementById("transactions-container");
      reports.style = "display:none";
      transactions.style = "display:none";
      preferences.style = "display:none";
      home.style = "display:none";
      login.style = "display:none";
      signup.style = "display:block";
      document.body.style.background =
        "linear-gradient(90deg, #3c3b3b 50%, #50827e 50%)";
      //remove the user from the session
      fetch("http://localhost:5000/session", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Methods": "DELETE",
        },
      })
        .then((response) => {
          if (response.status === 200) {
            console.log("User signed out.");
          } else {
            console.error("Failed to sign out:", response.statusText);
          }
        })
        .catch((error) => {
          console.error("Error signing out:", error);
        });
    },

    parseCSV: function (data) {
      //parse the csv data and return an array of objects
      return d3.csvParse(data, function (d) {
        return {
          datetime: new Date(d.datetime).toLocaleString("en-US", {
            month: "short",
            year: "numeric",
          }),
          portfolio_value: +d.portfolio_value,
          todays_return: d.return,
        };
      });
    },

    createChart: function (data) {
      //create a chart using the parsed data, use datetime as the x-axis and portfolio value as the y-axis
      var labels = data.map(function (d) {
        return d.datetime;
      });

      var values = data.map(function (d) {
        return d.portfolio_value;
      });

      //create the chart
      var ctx = document.getElementById("myChart").getContext("2d");
      var myChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Portfolio Value",
              data: values,
              borderColor: "rgba(119, 255, 228, 0.7)",
              backgroundColor: "rgba(0, 0, 255, 0.1)",
              borderWidth: 1,
              options: {
                responsive: true,
                maintainAspectRatio: true,
              },
            },
          ],
        },
      });
    },

    changeBackgroundColor: function (symbol) {
      //change the background color of the selected symbol
      this.backgroundColor = "rgba(119, 255, 228, 0.4)";
      this.selectedSymbol = symbol;
    },

    async loadPositiveNews() {
      //load the positive news from the server
      const response = await fetch("http://localhost:5000/get-positive-news", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Methods": "GET",
        },
        credentials: "include",
      });
      if (response.status !== 200) {
        console.error("Failed to load positive news:", response.statusText);
        return;
      }
      const data = await response.text();
      const lines = data.split("\n");
      //parse the data and store it in the positive news array filter out any empty lines
      this.positiveNews = lines
        .filter((line) => line.trim() !== "")
        .map((line) => {
          //map is like a for loop, it goes through each line and splits it by the comma
          const [headline, url, sentiment] = line.split(",");
          return { headline: headline, url: url, sentiment: sentiment };
        });
      console.log("Positive News:", this.positiveNews);
    },

    loadChartData: function () {
      //load the chart data from the server and call the create chart function after parsing the data
      var self = this;
      fetch("http://localhost:5000/get-csv-stats", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Methods": "GET",
        },
        credentials: "include",
      })
        .then((response) => response.text())
        .then(function (data) {
          console.log("Data:", data);
          var parsedData = self.parseCSV(data);
          self.chartData = parsedData;
          self.createChart(parsedData);

          // if there is data, set the current return and portfolio value to the last value in the data
          if (parsedData.length > 0) {
            self.current_return = parseFloat(
              parsedData[parsedData.length - 1].todays_return
            ).toFixed(2);
            self.current_port_value = parseFloat(
              parsedData[parsedData.length - 1].portfolio_value
            ).toFixed(2);
          }
        })
        .catch(function (error) {
          console.error("Error loading CSV file:", error);
        });
    },

    parseCSVData: function (data) {
      //seperate csv function to parse transactions data differently than stats data since the data is passed from server differently
      let csvData = [];
      data.forEach((file) => {
        const results = Papa.parse(file, {
          header: true,
          dynamicTyping: true,
        });
        if (results.data) {
          csvData.push(...results.data);
        }
      });
      return csvData;
    },

    async loadTransactions() {
      //get the trades file information for each user symbol and parse the data to display it
      const response = await fetch("http://localhost:5000/get-csv-trades", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Methods": "GET",
        },
        credentials: "include",
      });
      if (response.status !== 200) {
        console.error("Failed to load transactions:", response.statusText);
        return;
      }
      const data = await response.json();
      const csvData = data.csv_data;
      const parsedData = this.parseCSVData(csvData);

      var transactions = [];

      //parse the data and store it in the transactions array
      parsedData.forEach((row) => {
        console.log("Row:", row);

        const transaction = {
          date: row.date,
          strategy: row.strategy,
          symbol: row.symbol,
          side: row.side,
          type: row.type,
          status: row.status,
          multiplier: row.multiplier,
          time_in_force: row["time_in_force"],
          asset_strike: row["asset_strike"],
          asset_multiplier: row["asset_multiplier"],
          asset_type: row["asset_type"],
          price: row.price,
          time: row.time,
          filled_quantity: row["filled_quantity"],
          trade_cost: row["trade_cost"],
        };
        // if there are any empty values don't display them
        if (transaction.price === "" || transaction.price === "0") {
          return;
        }
        if (transaction.side === "buy") {
          transaction.action = "Bought";
        } else if (transaction.side === "sell") {
          transaction.action = "Sold";
        }
        const quantity = parseFloat(transaction.filled_quantity);
        if (!isNaN(quantity) && quantity !== 0) {
          transaction.filled_quantity = quantity.toFixed(0);
        } else {
          return;
        }
        const price = parseFloat(transaction.price);
        if (!isNaN(price) && price !== 0) {
          transaction.price = price.toFixed(2);
        } else {
          return;
        }
        const date = new Date(transaction.time);
        if (!isNaN(date)) {
          transaction.time = new Date(date);
        }
        //format the date and time to display it in the correct format
        transaction.time = date.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
        });
        transactions.push(transaction);
      });
      console.log("Transaction list:", transactions);
      this.transactions = transactions;
      console.log("Transactions data member:", this.transactions);
    },
  },

  computed: {
    validationErrors: function () {
      return Object.keys(this.errorMessages).length > 0;
    },
  },

  created: function () {
    // check if the user is logged in and load the user's information
    fetch("http://localhost:5000/session", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (response.status === 200) {
          return response.json();
        } else {
          throw new Error("Failed to check session");
        }
      })
      .then((data) => {
        this.userInfo = data;
        this.displayHomePage();
        this.loadTransactions();
        this.loadChartData();
        this.loadPositiveNews();
        this.loadUserInfo();
        if (this.userInfo.symbols) {
          for (var i = 0; i < this.userInfo.symbols.length; i++) {
            this.userSymbols.push(this.userInfo.symbols[i]["symbol"]["symbol"]);
          }
        }
        console.log("User Symbols:", this.userSymbols);
      })
      .catch((error) => {
        console.error("Error checking session:", error);
        this.displayLogin();
      });
  },

  mounted: function () {
    // keep the user logged in if a session is in place and load the user's information
    fetch("http://localhost:5000/session", {
      method: "GET",
      credentials: "include",
    })
      .then((response) => response.json())
      .then((userData) => {
        if (userData.user) {
          this.userInfo = userData.user;
          this.loadTransactions();
          this.loadChartData();
          this.loadUserInfo();
          this.loadPositiveNews();
          for (var i = 0; i < this.userInfo.symbols.length; i++) {
            this.userSymbols.push(this.userInfo.symbols[i]["symbol"]["symbol"]);
          }
          console.log("User Symbols:", this.userSymbols);
        }
      })
      .catch((error) => {
        console.error("Error fetching user info:", error);
      });
  },
}).mount("#app");
