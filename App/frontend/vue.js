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
      symbols: ["AAPL", "GOOGL", "AMZN", "TSLA", "MSFT", "NFLX", "FB", "NVDA"],
      backgroundColor: "rgba(97, 102, 97, 0.45)",
      selectedSymbol: null,
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

    loadChartData: function () {
      var self = this;
      d3.text("BotStrategy_2024-04-14_19-11-08_stats.csv")
        .then(function (data) {
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
      const response = await fetch(
        "BotStrategy_2024-04-14_19-14-56_trades.csv"
      );
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

  mounted: function () {
    console.log("Vue app mounted.");
    this.loadChartData();
    this.loadTransactions();
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
