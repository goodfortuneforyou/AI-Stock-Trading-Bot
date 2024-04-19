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
      negativeNews: [],
      positiveNews: [],
    };
  },

  // object with more keys inside it.
  methods: {
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
          symbols: {},
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

    loginUser: async function () {
      // if (!this.validateReturningUserInputs()) return;
      const requestOptions = {
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
      const response = await fetch(
        "http://localhost:5000/session",
        requestOptions
      );
      if (response.status == 201) {
        const userData = await response.json();
        this.userInfo = userData.user;
        if (userData.message == "First login") {
          this.displayNewUserForm();
        } else if (userData.message == "Authenticated") {
          alert(
            "Welcome back, " +
              this.userInfo.name +
              "!. Please wait while our bot processes your data and loads your portfolio"
          );
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
          if (botResponse.status === 200) {
            console.log("Bot is running.");
          } else {
            console.error("Failed to run bot:", botResponse.statusText);
          }
          this.displayHomePage();
        }
        this.loadTransactions();
        this.loadChartData();
        this.loadPositiveNews();
      } else {
        this.errorMessages.login = "Invalid email or password.";
      }
    },

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
          symbols: { symbol: this.selectedSymbol, amount: this.amount },
        }),
      };
      fetch(`http://localhost:5000/symbols`, requestOptions)
        .then((response) => {
          if (response.status === 201) {
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

    displayHomePage: function () {
      this.loadUserInfo();
      var home = document.getElementById("dashboard_html");
      var signup = document.getElementById("signup_html");
      var login = document.getElementById("login_html");
      var new_user = document.getElementById("new_user_html");
      home.style = "display:block";
      login.style = "display:none";
      signup.style = "display:none";
      new_user.style = "display:none";
      document.body.style.background = "black";
    },

    displayLogin: function () {
      var login = document.getElementById("login_html");
      var signup = document.getElementById("signup_html");
      login.style = "display:block";
      signup.style = "display:none";
    },

    displayNewUserForm: function () {
      var form = document.getElementById("new_user_html");
      var login = document.getElementById("login_html");
      form.style = "display:block";
      login.style = "display:none";
    },

    signOut: function () {
      this.userInfo = {};
      this.transactions = [];
      this.userSymbols = [];
      this.chartData = [];
      var home = document.getElementById("dashboard_html");
      var signup = document.getElementById("signup_html");
      home.style = "display:none";
      signup.style = "display:block";
      document.body.style.background =
        "linear-gradient(90deg, #3c3b3b 50%, #50827e 50%)";
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
      var labels = data.map(function (d) {
        return d.datetime;
      });

      var values = data.map(function (d) {
        return d.portfolio_value;
      });

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
      this.backgroundColor = "rgba(119, 255, 228, 0.4)";
      this.selectedSymbol = symbol;
    },

    async loadPositiveNews() {
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
      this.positiveNews = lines.map((line) => {
        const [headline, url, sentiment] = line.split(",");
        return { headline: headline, url: url, sentiment: sentiment };
      });
      console.log("Positive News:", this.positiveNews);
    },

    loadChartData: function () {
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

    async loadTransactions() {
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
      const data = await response.text();
      const rows = data.split("\n").slice(1);
      for (const row of rows) {
        const columns = row.split(",");
        const transaction = {
          date: columns[0],
          strategy: columns[1],
          symbol: columns[2],
          side: columns[3],
          type: columns[4],
          status: columns[5],
          multiplier: columns[6],
          time_in_force: columns[7],
          asset_strike: columns[8],
          asset_multiplier: columns[9],
          asset_type: columns[10],
          price: columns[11],
          filled_quantity: columns[12],
          trade_cost: columns[13],
        };
        if (transaction.price === "" || transaction.price === "0") {
          continue;
        }
        if (transaction.side === "buy") {
          transaction.action = "Bought";
        } else if (transaction.side === "sell") {
          transaction.action = "Sold";
        }
        transaction.quantity = parseFloat(transaction.filled_quantity).toFixed(
          0
        );
        transaction.price = parseFloat(transaction.price).toFixed(2);
        transaction.date = new Date(transaction.date).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
        });
        this.transactions.push(transaction);
      }
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

  // IDs and classes only meant for css purposes shouldn't have to query them for js or for automated behaviour tests
  // created is a function that gets called once when it loads
  // this is like self in python. this.data_attribute or this.method_name
  // v-on establishes an event listener its a directive, data binding, rendering
}).mount("#app");
