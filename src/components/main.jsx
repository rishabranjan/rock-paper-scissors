import React, { Component } from "react";
import "../App.css";

class Main extends Component {
  state = {
    userScore: 0,
    computerScore: 0
  };

  getComputerChoice = () => {
    const choices = ["r", "p", "s"];
    const randomNumber = Math.floor(Math.random() * 3);
    return choices[randomNumber];
  };

  convertToWord = letter => {
    if (letter === "r") return "Rock";
    if (letter === "p") return "Paper";
    else return "Scissors";
  };

  win = (userChoice, ComputerChoice) => {
    const state = this.state;
    state.userScore++;
    this.setState({ state });
    const user = "user".fontsize(3).sub();
    const comp = "comp".fontsize(3).sub();
    document.querySelector(".results > p").innerHTML =
      this.convertToWord(userChoice) +
      user +
      " beats " +
      this.convertToWord(ComputerChoice) +
      comp +
      ".You win!";
    document.getElementById(userChoice).classList.add("green-glow");
    setTimeout(function() {
      document.getElementById(userChoice).classList.remove("green-glow");
    }, 300);
    this.reset();
  };

  lose = (userChoice, ComputerChoice) => {
    const state = this.state;
    state.computerScore++;
    this.setState({ state });
    const user = "user".fontsize(3).sub();
    const comp = "comp".fontsize(3).sub();
    document.querySelector(".results > p").innerHTML =
      this.convertToWord(ComputerChoice) +
      comp +
      " beats " +
      this.convertToWord(userChoice) +
      user +
      ".You lose!";
    document.getElementById(userChoice).classList.add("red-glow");
    setTimeout(function() {
      document.getElementById(userChoice).classList.remove("red-glow");
    }, 300);
    this.reset();
  };

  draw = (userChoice, ComputerChoice) => {
    const user = "user".fontsize(3).sub();
    const comp = "comp".fontsize(3).sub();
    document.querySelector(".results > p").innerHTML =
      this.convertToWord(userChoice) +
      user +
      " equals " +
      this.convertToWord(ComputerChoice) +
      comp +
      ".It's a draw!";
    document.getElementById(userChoice).classList.add("grey-glow");
    setTimeout(function() {
      document.getElementById(userChoice).classList.remove("grey-glow");
    }, 300);
  };

  reset = () => {
    if (this.state.userScore === 10 || this.state.computerScore === 10) {
      const state = this.state;
      state.userScore = 0;
      state.computerScore = 0;
      this.setState({ state });
      document.querySelector(".results > p").innerHTML = "Let's Start!!";
    };
  };

  game = userChoice => {
    const ComputerChoice = this.getComputerChoice();
    console.log(ComputerChoice);
    // eslint-disable-next-line
    switch (userChoice + ComputerChoice) {
      case "rs":
      case "sp":
      case "pr":
        this.win(userChoice, ComputerChoice);
        break;
      case "rp":
      // eslint-disable-next-line
      case "rs":
      case "sr":
        this.lose(userChoice, ComputerChoice);
        break;
      case "rr":
      case "pp":
      case "ss":
        this.draw(userChoice, ComputerChoice);
        break;
    }
  };

  render() {
    return (
      <React.Fragment>
        <header>
          <h1 id="heading">
            <span id="rock">Rock</span> <span id="paper">Paper</span>{" "}
            <span id="scissor">Scissor</span>
          </h1>
        </header>
        <div className="score-board">
          <div id="user-label" className="badge">
            user
          </div>
          <div id="comp-label" className="badge">
            comp
          </div>
          <span id="user-score">{this.state.userScore}</span>:
          <span id="computer-score">{this.state.computerScore}</span>
        </div>
        <div className="results">
          <p>Let's Start!!</p>
        </div>
        <React.Fragment>
          <div className="choices">
            <div className="choice" id="r">
              <img
                onClick={() => {
                  this.game("r", this.getComputerChoice());
                }}
                src="./images/rock.png"
                alt="rock"
              />
            </div>
            <div className="choice" id="p">
              <img
                onClick={() => {
                  this.game("p", this.getComputerChoice());
                }}
                src="./images/paper.png"
                alt="paper"
              />
            </div>
            <div className="choice" id="s">
              <img
                onClick={() => {
                  this.game("s", this.getComputerChoice());
                }}
                src="./images/scissor.png"
                alt="scissor"
              />
            </div>
          </div>
        </React.Fragment>
        <p id="action-message">Make your move.</p>
      </React.Fragment>
    );
  }
}

export default Main;
