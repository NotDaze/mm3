const Discord = require("discord.js");
const fs = require("fs");
var client = new Discord.Client();

var updateInterval, date, accounts = [], parties = [], games = [];

var roleSetups = {}, roleGroups = {};

var prefixes = {};

importJSON = function() {
  fs.readFile("userdata.json", "utf8", function(err, data) {
    if(err) throw err;
    var dataObj = JSON.parse(data);
    for(var i = 0; i < dataObj.accounts.length; i++) {
      accounts.push(new Account(dataObj.accounts[i]));
    }
    console.log("Data imported!");
  });
  fs.readFile("prefixdata.json", "utf8", function(err, data) {
    if(err) throw err;
    prefixes = JSON.parse(data);
  });
};
exportAccountData = function() {
  var newData = {
    accounts: [],
  };
  for(var i = 0; i < accounts.length; i++) {
    newData.accounts.push(accounts[i].getData());
  }
  console.log("Data stored!");
  fs.writeFileSync("userdata.json", JSON.stringify(newData, null, 2));
};
exportPrefixData = function() {
  fs.writeFileSync("prefixdata.json", JSON.stringify(prefixes));
};

importJSON();

var cards = [
  /*{//#-1 - TEMPLATE
    name: "",
    targets: 0,
    cost: 0,
    instant: ,
    priority: 1,
    desc: "",
    effect: function(user, target) {
      
    }
  },*/
  {//#0 - predict
    name: "predict",
    targets: 1,
    cost: 7,
    instant: false,
    priority: 1,
    desc: "Learn two possibilities for your target's role, one of which is correct.",
    effect: function(user, target) {
      var pred = target.prediction();
      user.send("Prediction: Your target is either a(n) **" + capitalize(pred[0]) + "** or a(n) **" + capitalize(pred[1]) + "**!");
    }
  },
  {//#1 - read
    name: "read",
    targets: 1,
    cost: 9,
    desc: "Learn your target's exact role.",
    instant: false,
    priority: 1,
    effect: function(user, target) {
      var pred = target.prediction();
      user.send("Read: Your target is a **" + capitalize(target.readrole) + "**!");
      target.send("You sense something is off... you must have been read! Your identity is known!");
    }
  },
  {//#2 - heal
    name: "heal",
    targets: 1,
    cost: 9,
    instant: false,
    priority: 5,
    desc: "Gives your target two minimum defense tonight only.",
    effect: function(user, target) {
      target.minDef(2);
    }
  },
  {//#3 - protecc
    name: "protect",
    targets: 1,
    cost: 6,
    instant: false,
    priority: 5,
    desc: "Gives your target one minimum defense tonight only.",
    effect: function(user, target) {
      target.minDef(1);
    }
  },
  {//#4 - ponder
    name: "ponder",
    targets: 0,
    cost: 0,
    instant: true,
    priority: 1,
    desc: "Gain 4 ðŸŽ© Intellect",
    effect: function(user) {
      user.intellect += 4;
    }
  },
  {//#5 - contemplate
    name: "contemplate",
    targets: 0,
    cost: 3,
    instant: true,
    priority: 1,
    desc: "Draw two cards.",
    effect: function(user) {
      user.drawCards(2, 7);
    }
  },
  {//#6 - understand
    name: "understand",
    targets: 0,
    cost: 5,
    instant: true,
    priority: 1,
    desc: "Draw three cards.",
    effect: function(user) {
      user.drawCards(3, 7);
    }
  },
  {//#7 - infiltrate
    name: "infiltrate",
    targets: 1,
    cost: 7,
    instant: false,
    priority: 1,
    desc: "Learn your target's base defense.",
    effect: function(user, target) {
      var pred = target.prediction();
      user.send("Read: Your target has **" + target.role.defense + "** defense!");
    }
  },
  {//#8 - strike
    name: "strike",
    targets: 1,
    cost: 6,
    instant: false,
    priority: 4,
    desc: "1-strength âš” Attack to target",
    effect: function(user, target) {
      target.attack(1, user);
    }
  },
  {//#9 - stab
    name: "stab",
    targets: 1,
    cost: 9,
    instant: false,
    priority: 4,
    desc: "2-strength âš” Attack to target",
    effect: function(user, target) {
      target.attack(2, user);
    }
  },
  {//#10 - shot
    name: "shot",
    targets: 1,
    cost: 10,
    instant: false,
    priority: 4,
    desc: "3-strength âš” Attack to target",
    effect: function(user, target) {
      target.attack(3, user);
    }
  },
  {//#11 - rejuvenate
    name: "rejuvenate",
    targets: 0,
    cost: 1,
    instant: true,
    priority: 1,
    desc: "Gain 1 ðŸŽ© Intellect for each card in your hand.",
    effect: function(user, target) {
      user.intellect += user.hand.length;
    }
  },
  {//#12 - beyond
    name: "beyond",
    targets: 0,
    cost: 3,
    instant: true,
    priority: 1,
    desc: "Discard your hand. Draw four cards.",
    effect: function(user) {
      user.discardHand();
      user.drawCards(4);
    }
  },
  {//#13 - conjecture
    name: "conjecture",
    targets: 0,
    cost: 3,
    instant: true,
    priority: 1,
    desc: "Lose all intellect and draw that many cards.",
    effect: function(user) {
      user.drawCards(user.intellect - 3, 7);
      user.intellect = 3;
    }
  },
  {//#14 - avenge
    name: "avenge",
    targets: 1,
    cost: 7,
    instant: false,
    priority: 4,
    desc: "1-Strength âš” Attack. If success + victim is guest, lose all intellect.",
    effect: function(user, target) {
      if(target.attack(1, user) && target.role.faction === "guest") {
        user.send("You killed an ally! Consumed by guilt, unable to focus, you will have no ðŸŽ© Intellect tomorrow.");
        user.intellectModifier = -Infinity;
      }
    }
  },
  {//#15 - death
    name: "death",
    targets: 1,
    cost: 3,
    instant: false,
    priority: 4,
    desc: "3-strength âš” Attack to target. Discard your hand.",
    rare: true,
    effect: function(user, target) {
      target.attack(3, user);
      target.send("Instant death. Sorry I added such an unfair card to the game.");
      user.discardRandom(1);
    }
  },
  {//#16 - threaten
    name: "threaten",
    targets: 1,
    cost: 1,
    instant: false,
    priority: 0,
    desc: "Target discards a random card.",
    effect: function(user, target) {
      target.discardRandom(1);
      target.send("You have been threatened!");
    }
  },
  {//#17 - deprive
    name: "deprive",
    targets: 1,
    cost: 4,
    instant: false,
    priority: 0,
    desc: "Target discards two random cards.",
    effect: function(user, target) {
      target.discardRandom(2);
      target.send("You have been deprived!");
    }
  },
  {//#18 - support
    name: "support",
    targets: 1,
    cost: 0,
    instant: false,
    desc: "Give target all your intellect.",
    priority: 1,
    effect: function(user, target) {
      target.intellectModifier += user.intellect;
      target.send("You have been supported! Received " + user.intellect + " ðŸŽ© Intellect for tomorrow.");
      user.loseAllIntellect();
    }
  },
  {//#19 - betray
    name: "betray",
    targets: 1,
    cost: 0,
    instant: false,
    desc: "Lose all intellect, and target loses that many as well.",
    priority: 1,
    effect: function(user, target) {
      target.intellectModifier -= user.intellect;
      target.send("You have been betrayed! Lost " + user.intellect + " ðŸŽ© Intellect for tomorrow.");
      user.loseAllIntellect();
    }
  },
  {//#20 - bribe
    name: "bribe",
    targets: 1,
    cost: 5,
    instant: false,
    priority: 0,
    desc: "Steal a random card from target. Target gains 3 ðŸŽ© Intellect",
    effect: function(user, target) {
      if(target.hand.length === 0) {
        user.send("Your target has no cards! They could not be bribed.");
        return;
      }
      if(user.hand.length === 6) {
        user.discardRandom(1);
      }
      user.placeInHand(target.hand.splice(Math.floor(Math.random() * target.hand.length), 1));
      user.send("Bribe successful! You stole a card!");
      target.send("You've been bribed! A random card was stolen! However, you gain 3 ðŸŽ© Intellect");
      
      target.intellectModifier += 3;
    }
  },
  {//#21 - believe
    name: "believe",
    targets: 0,
    cost: 7,
    instant: true,
    desc: "Draw four cards.",
    effect: function(user) {
      user.drawCards(4, 7);
    }
  },
  {//#22 - secrets
    name: "secrets",
    targets: 1,
    cost: 9,
    instant: false,
    priority: 0,
    desc: "Target refreshes hand, draws a card. You see their new hand.",
    rare: true,
    effect: function(user, target) {
      target.refreshHand();
      target.drawCards(1);
      target.send("Your secrets are revealed... someone knows your new hand!");
      var yourResponse = "Secret Hand:"
      for(var i = 0; i < target.hand.length; i++) {
        var yourCard = cards[target.hand[i]];
        yourResponse += "\n**" + (i + 1) + ")** #" + target.hand[i] + " - " + capitalize(yourCard.name) + " - " + yourCard.cost + " ðŸŽ© - " + yourCard.desc;
      }
      user.send(yourResponse);
    }
  },
  {//#23 - angelic
    name: "angelic",
    targets: 1,
    cost: 9,
    instant: false,
    priority: 5,
    desc: "Target has +2 ðŸ›¡ Defense tonight and draws 2 cards.",
    rare: true,
    effect: function(user, target) {
      target.bonusDefense = 2;
      target.drawCards(2);
      target.send("An angel's wings shield you... +2 Cards, +2 ðŸ›¡ Defense");
    }
  },
  {//#24 - rest
    name: "rest",
    targets: 0,
    cost: 4,
    instant: true,
    desc: "Refresh your hand. Draw a card.",
    rare: true,
    effect: function(user) {
      user.refreshHand();
      user.drawCards(1, 7);
      user.send("Unusually well rested, tonight you are remarkably focused. Refresh hand, +1 Card.");
    }
  },
  {//#25 - guard
    name: "guard",
    targets: 1,
    cost: 8,
    instant: false,
    priority: 4,
    desc: "All target visitors attacked with a 1-strength âš” Attack. +1 Target ðŸ›¡ Defense.",
    effect: function(user, target) {
      target.bonusDefense++;
      target.send("You have been guarded! An anonymous helper will attack all your visitors (1-strength). +1 ðŸ›¡ Defense.");
      for(var i = 0; i < target.visitors.length; i++) {
        if(target.visitors[i] !== user) {
          target.visitors[i].attack(1, user);
        }
      }
    }
  },
  {//#26 - valiant
    name: "valiant",
    targets: 1,
    cost: 9,
    instant: false,
    priority: 4,
    desc: "+1 Target ðŸ›¡ Defense. 2-strength âš” Attack to random target visitor.",
    effect: function(user, target) {
      target.bonusDefense += 2;
      target.send("Valiance smiles upon you. +1 ðŸ›¡ Defense, a random visitor will be attacked (2-strength)");
      var vis = target.visitors.slice();
      for(var i = 0; i < vis.length; i++) {
        if(vis[i] === user) {
          vis.splice(i, 1);
        }
      }
      if(vis.length !== 0) {
        vis[Math.floor(Math.random() * vis.length)].attack(2, user);
      }
    }
  },
  {//#27 - vigilance
    name: "vigilance",
    targets: 0,
    cost: 4,
    instant: true,
    desc: "+1 ðŸ›¡ Defense tonight",
    effect: function(user, target) {
      user.bonusDefense++;
    }
  },
  {//#28 - sabotage
    name: "sabotage",
    targets: 1,
    cost: 6,
    instant: false,
    desc: "-1 Target ðŸ›¡ Defense",
    priority: 5,
    effect: function(user, target) {
      target.bonusDefense--;
      target.send("You've been sabotaged, and left vulnerable to attack! -1 ðŸ›¡ Defense!");
    }
  },
  {//#29 - unstoppable
    name: "unstoppable",
    targets: 1,
    cost: 10,
    instant: false,
    priority: 1,
    rare: true,
    desc: "Target discards their hand and draws two cards. Draw a card.",
    effect: function(user, target) {
      target.discardHand();
      target.drawCards(2);
      target.send("A force has been awakened that cannot be stopped. You discarded your hand and draw two cards!");
    }
  },
  {//#30 - distract
    name: "distract",
    targets: 1,
    cost: 5,
    instant: false,
    priority: 1,
    desc: "Target has 5 less ðŸŽ© Intellect tomorrow.",
    effect: function(user, target) {
      target.intellectModifier -= 5;
      target.send("You, disturbed by the feeling of being watched, are unable to focus. -5 ðŸŽ© Intellect tonight.");
    }
  },
  {//#31 - oath
    name: "oath",
    targets: 1,
    cost: 1,
    instant: false,
    desc: "-1 Target ðŸ›¡ Defense, -1 ðŸ›¡ Defense",
    priority: 5,
    effect: function(user, target) {
      target.bonusDefense--;
      target.send("A blood oath awakens! -1 ðŸ›¡ Defense!");
      user.bonusDefense--;
      user.send("A blood oath awakens! -1 ðŸ›¡ Defense");
    }
  },
  {//#32 - reveal
    name: "reveal",
    targets: 1,
    cost: 10,
    instant: false,
    priority: 1,
    desc: "Reveals target's role to everyone.",
    effect: function(user, target) {
      Game.findFromPlayerID(user.account.ID).announce("It has been anonymously revealed that **#" + target.ID + "** is a **" + capitalize(target.readrole) + "**!");
    }
  },
  {//#33 - birthright
    name: "birthright",
    targets: 1,
    cost: 6,
    instant: false,
    priority: 5,
    desc: "Learn target's role. -1 ðŸ›¡ Defense tonight.",
    effect: function(user, target) {
      user.bonusDefense -= 2;
      user.send("Read: Your target is a **" + capitalize(target.readrole) + "**!");
    }
  },
  {//#34 - blood
    name: "blood",
    targets: 0,
    cost: 2,
    instant: true,
    desc: "Draw two cards. -1 ðŸ›¡ Defense tonight.",
    effect: function(user, target) {
      user.bonusDefense--;
      user.drawCards(2, 7);
    }
  },
  {//#35 - careless
    name: "careless",
    targets: 0,
    cost: 0,
    instant: true,
    desc: "+3 ðŸŽ© Intellect. -1 ðŸ›¡ Defense tonight.",
    effect: function(user, target) {
      user.bonusDefense--;
      user.intellect += 3;
    }
  },
  {//#36 - assassinate
    name: "assassinate",
    targets: 1,
    cost: 10,
    instant: false,
    priority: 4,
    desc: "2-strength ðŸ”ª Silent Attack to target",
    effect: function(user, target) {
      target.attack(2, user, true);
    }
  },
  {//#37 - hunt
    name: "hunt",
    targets: 1,
    cost: 8,
    instant: false,
    priority: 4,
    desc: "1-strength ðŸ”ª Silent Attack to target",
    effect: function(user, target) {
      target.attack(1, user, true);
    }
  },
  {//#38 - forethought
    name: "forethought",
    targets: 0,
    cost: 5,
    instant: true,
    desc: "+6 ðŸŽ© Intellect tomorrow.",
    effect: function(user, target) {
      user.intellectModifier += 6;
    }
  },
  {//#39 - invest
    name: "invest",
    targets: 0,
    cost: 0,
    instant: true,
    desc: "Lose all ðŸŽ© Intellect, and gain that many tomorrow.",
    effect: function(user, target) {
      user.intellectModifier += user.intellect;
      user.intellect = 0;
    }
  },
  {//#40 - rage
    name: "rage",
    targets: 1,
    cost: 8,
    instant: false,
    priority: 1,
    desc: "1-Strength ðŸ’£ Rampage Attack to target.",
    effect: function(user, target) {
      target.attack(1, user);
      for(var i = 0; i < target.visitors.length; i++) {
        if(target.visitors[i] !== user) {
          target.visitors[i].attack(1, user);
        }
      }
    }
  },
  {//#41 - frenzy
    name: "frenzy",
    targets: 1,
    cost: 10,
    instant: false,
    priority: 1,
    desc: "2-Strength ðŸ’£ Rampage Attack to target.",
    effect: function(user, target) {
      target.attack(2, user);
      for(var i = 0; i < target.visitors.length; i++) {
        if(target.visitors[i] !== user) {
          target.visitors[i].attack(2, user);
        }
      }
    }
  },
  {//#42 - intimidate
    name: "intimidate",
    targets: 1,
    cost: 5,
    instant: false,
    priority: 0,
    desc: "Target discards a random card. Draw two cards.",
    effect: function(user, target) {
      target.discardRandom(1);
      target.send("You've been intimidated!");
      user.drawCards(2, 7);
    }
  },
  {//#43 - meditate
    name: "meditate",
    targets: 0,
    cost: 0,
    instant: true,
    priority: 1,
    desc: "Lose all intellect and draw that many cards.",
    rare: true,
    effect: function(user) {
      user.drawCards(user.intellect, 7);
      user.loseAllIntellect();
    }
  },
  {//#44 - fortify
    name: "fortify",
    targets: 1,
    cost: 10,
    instant: false,
    priority: 5,
    desc: "Target and visitors (including you) have 1 Minimum Defense ðŸ›¡",
    effect: function(user, target) {
      target.minDef(1);
      target.send("You've been fortified! 1 ðŸ›¡ Minimum Defense");
      for(var i = 0; i < target.visitors.length; i++) {
        target.visitors[i].minDef(1);
        if(target.visitors[i] !== user) {
          target.visitors[i].send("You've been fortified! 1 ðŸ›¡ Minimum Defense");
        }
      }
    }
  },
  {//#45 - censor
    name: "censor",
    targets: 1,
    cost: 7,
    instant: false,
    priority: 1,
    desc: "Target cannot speak or whisper tomorrow.",
    effect: function(user, target) {
      target.silenced = true;
      target.send("You've been silenced! You can't speak today.");
    }
  },
  {//#46 - trick
    name: "trick",
    targets: 1,
    cost: 5,
    instant: false,
    priority: 1,
    desc: "Steal a card from target. This card is put in their hand.",
    destroy: true,
    effect: function(user, target) {
      if(target.hand.length === 0) {
        user.send("Your target has no cards! They could not be tricked.");
        return;
      }
      if(user.hand.length === 6) {
        user.discardRandom(1);
      }
      user.placeInHand(target.hand.splice(Math.floor(Math.random() * target.hand.length), 1));
      target.send("You've been tricked! A random card in your hand was replaced with a trick.");
      target.hand.push(52);
    }
  },
  {//#47 - interrogate
    name: "interrogate",
    targets: 1,
    cost: 6,
    instant: false,
    priority: 1,
    desc: "Learn a random faction that target is *not*.",
    effect: function(user, target) {
      var factions = ["impostor", "guest", "neutral"];
      var fac = Math.floor(Math.random() * 3);
      while(factions[fac] === target.role.faction) {
        fac = Math.floor(Math.random() * 3);
      }
      user.send("Through careful interrogation, you have determined that your target is not a **" + capitalize(factions[fac]) + "**!");
    }
  },
  {//#48 - nullify
    name: "nullify",
    targets: 1,
    cost: 8,
    instant: false,
    priority: 1,
    desc: "Target has 0 ðŸ‘¥ Vote Strength tomorrow.",
    effect: function(user, target) {
      target.voteStrength = -Infinity;
      target.send("You've been nullified! Your vote is worthless tomorrow!");
    }
  },
  {//#49 - powerless
    name: "powerless",
    targets: 1,
    cost: 7,
    instant: false,
    priority: 1,
    desc: "Target loses 1 ðŸ‘¥ Vote Strength tomorrow.",
    effect: function(user, target) {
      target.voteStrength = -Infinity;
      target.send("You've been rendered powerless! -1 ðŸ‘¥ Vote Strength tomorrow!");
    }
  },
  {//#50 - endorse
    name: "endorse",
    targets: 1,
    cost: 7,
    instant: false,
    priority: 1,
    desc: "Target gains 1 ðŸ‘¥ Vote Strength tomorrow.",
    effect: function(user, target) {
      target.voteStrength++;
      target.send("You've been endorsed! +1 ðŸ‘¥ Vote Strength tomorrow!");
    }
  },
  {//#51 - influence
    name: "influence",
    targets: 1,
    cost: 8,
    instant: true,
    priority: 1,
    desc: "+1 ðŸ‘¥ Vote Strength tomorrow.",
    effect: function(user) {
      user.voteStrength++;
    }
  },
  {//#52 - equality
    name: "equality",
    targets: 1,
    cost: 0,
    instant: false,
    priority: 0,
    desc: "Target has exactly 1 ðŸ‘¥ Vote Strength tomorrow. Overrides Nullify.",
    effect: function(user, target) {
      target.voteStrength = -Infinity;
      target.send("You've been equalized! Exactly 1 ðŸ‘¥ Vote Strength tomorrow!");
    }
  },
  {//#53 - love
    name: "love",
    targets: 1,
    cost: 1,
    instant: false,
    desc: "+1 Target ðŸ›¡ Defense, -1 ðŸ›¡ Defense",
    priority: 5,
    effect: function(user, target) {
      target.bonusDefense--;
      target.send("A loving bond awakens! +1 ðŸ›¡ Defense!");
      user.bonusDefense--;
      user.send("A loving bond awakens! -1 ðŸ›¡ Defense");
    }
  },
  {//#54 - shuffle
    name: "shuffle",
    targets: 1,
    cost: 7,
    instant: false,
    desc: "Shuffle target's read role tonight.",
    priority: 5,
    effect: function(user, target) {
      target.shuffle();
    }
  },
  {//#55 - revile
    name: "revile",
    targets: 1,
    cost: 10,
    instant: false,
    priority: 1,
    desc: "Reveals a fake role attributed to target.",
    effect: function(user, target) {
      var all = Object.keys(roles);
      Game.findFromPlayerID(user.account.ID).announce("It has been anonymously revealed that **#" + target.ID + "** is a **" + capitalize(all[Math.floor(Math.random() * all.length)]) + "**!");
    }
  },
  {//#56 - summon
    name: "summon",
    targets: 0,
    cost: 5,
    instant: true,
    desc: "Summon a minion if you have fewer than five.",
    effect: function(user) {
      user.special.minions = (user.special.minions || 0);
      if(user.special.minions < 5) {
        user.special.minions++;
      }
    }
  },
  {//#57 - thinkers
    name: "thinkers",
    targets: 0,
    cost: 0,
    instant: true,
    desc: "Gain one Intellect per minion.",
    effect: function(user) {
      user.special.minions = (user.special.minions || 0);
      user.intellect += user.special.minions;
    }
  },
  {//#58 - creators
    name: "creators",
    targets: 0,
    cost: 5,
    instant: true,
    desc: "Gain one Intellect per minion.",
    effect: function(user) {
      user.special.minions = (user.special.minions || 0);
      user.drawCards(user.special.minions, 7);
    }
  },
  {//#59 - destroyers
    name: "destroyers",
    targets: 1,
    cost: 5,
    instant: false,
    priority: 1,
    desc: "Lose 3 minions. 2 strength attack to target.",
    effect: function(user, target) {
      user.special.minions = (user.special.minions || 0);
      if(user.special.minions >= 3) {
        user.special.minions -= 3;
        target.attack(2, user);
      }
    }
  },
  {//#60 - sponsors
    name: "sponsors",
    targets: 1,
    cost: 9,
    instant: true,
    desc: "Lose 3 minions. 2 strength attack to target.",
    effect: function(user, target) {
      user.special.minions = (user.special.minions || 0);
      user.voteStrength += user.special.minions;
    }
  },
  {//#61 - protectors
    name: "protectors",
    targets: 1,
    cost: 2,
    instant: true,
    desc: "Lose 3 minions. 2 strength attack to target.",
    effect: function(user, target) {
      user.special.minions = (user.special.minions || 0);
      user.bonusDefense += user.special.minions;
    }
  },
  {//#62 - razers
    name: "razers",
    targets: 1,
    cost: 3,
    instant: false,
    priority: 1,
    desc: "Lose 1 minion. 1 strength attack to target.",
    effect: function(user, target) {
      user.special.minions = (user.special.minions || 0);
      if(user.special.minions >= 1) {
        user.special.minions--;
        target.attack(1, user);
      }
      else{
        user.send("You didn't have enough minions to raze your target!")
      }
    }
  },
  {//#63 - colliders
    name: "colliders",
    targets: 1,
    cost: 1,
    instant: false,
    priority: 1,
    desc: "Lose 3 minions. 1 strength rampage attack to target.",
    effect: function(user, target) {
      user.special.minions = (user.special.minions || 0);
      if(user.special.minions >= 3) {
        user.special.minions -= 3;
        target.attack(1, user);
        for(var i = 0; i < target.visitors.length; i++) {
          if(target.visitors[i] !== user) {
            target.visitors[i].attack(1, user);
          }
        }
      }
      else{
        user.send("You didn't have enough minions to collide with your target!")
      }
    }
  },
  {//#64 - kidnappers
    name: "kidnappers",
    targets: 1,
    cost: 4,
    instant: false,
    priority: 1,
    desc: "Lose 2 minions. 1 strength attack to target.",
    effect: function(user, target) {
      user.special.minions = (user.special.minions || 0);
      if(user.special.minions >= 2) {
        user.special.minions -= 2;
        target.attack(1, user, true);
      }
      else{
        user.send("You didn't have enough minions to kidnap your target!")
      }
    }
  },
  {//#65 - spawn
    name: "spawn",
    targets: 0,
    cost: 9,
    instant: true,
    desc: "Summon 2 minions if you have fewer than 5.",
    effect: function(user) {
      user.special.minions = (user.special.minions || 0);
      if(user.special.minions < 5) {
        user.special.minions += 2;
      }
    }
  },
];

var roles = {
  investigator: {
    faction: "guest",
    subclass: "investigative",
    deck: [0, 0, 0, 0, 0, 1, 1, 1, 32, 32, 4, 5, 6, 19, 20, 46],
    voteStrength: 1,
    defense: 0,
  },
  doctor: {
    faction: "guest",
    subclass: "protective",
    deck: [2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 7, 7, 5, 6, 18],
    voteStrength: 1,
    defense: 0,
  },
  vigilante: {
    faction: "guest",
    subclass: "killing",
    deck: [14, 14, 14, 14, 14, 14, 14, 4, 4, 7, 7, 8, 8, 28, 28, 19],
    voteStrength: 1,
    defense: 0,
  },
  guardian: {
    faction: "guest",
    subclass: "protective",
    deck: [25, 25, 25, 25, 26, 26, 26, 26, 3, 3, 27, 27, 4, 5, 6, 18],
    voteStrength: 1,
    defense: 0,
  },
  ringleader: {
    faction: "impostor",
    subclass: "killing",
    deck: [8, 8, 8, 8, 8, 8, 9, 9, 9, 4, 4, 7, 7, 10, 19, 28],
    voteStrength: 1,
    defense: 1,
  },
  assassin: {
    faction: "impostor",
    subclass: "killing",
    deck: [9, 9, 9, 9, 27, 27, 27, 36, 36, 36, 4, 4, 42, 42, 6, 10],
    voteStrength: 1,
    defense: 0,
  },
  lawyer: {
    faction: "guest",
    subclass: "support",
    deck: [20, 20, 20, 20, 5, 5, 5, 51, 51, 51, 4, 50, 48, 49],
    voteStrength: 2,
    defense: 0,
  },
  prosecutor: {
    faction: "impostor",
    subclass: "deception",
    deck: [20, 20, 20, 20, 19, 19, 19, 7, 7, 7, 17, 17, 5, 6, 49, 51],
    voteStrength: 2,
    defense: 0
  },
  maw: {
    faction: "neutral",
    subclass: "killing",
    deck: [40, 40, 40, 40, 27, 27, 27, 41, 41, 4, 4, 5, 6, 29, 42],
    voteStrength: 1,
    defense: 0,
  },
  eternal: {
    faction: "neutral",
    subclass: "benign",
    deck: [27, 27, 27, 27, 27, 20, 20, 20, 3, 3, 4, 4, 42, 42, 1, 38],
    voteStrength: 1,
    defense: 0
  },
  trickster: {
    faction: "neutral",
    subclass: "evil",
    deck: [46, 46, 46, 46, 20, 20, 20, 4, 4, 42, 42, 55, 55, 19, 27, 54],
    voteStrength: 1,
    defense: 0
  },
  thug: {
    faction: "impostor",
    subclass: "support",
    deck: [8, 8, 8, 8, 37, 37, 37, 42, 42, 42, 17, 4, 5, 6, 41],
    voteStrength: 1,
    defense: 0
  },
  silencer: {
    faction: "impostor",
    subclass: "support",
    deck: [51, 51, 51, 51, 51, 51, 19, 19, 19, 20, 20, 42, 42, 4, 5, 6, 17],
    voteStrength: 1,
    defense: 0
  },
  sheriff: {
    faction: "guest",
    subclass: "investigative",
    deck: [47, 47, 47, 47, 47, 47, 1, 1, 2, 2, 4, 4, 45, 45, 5, 18],
    voteStrength: 1,
    defense: 0
  },
  disguiser: {
    faction: "impostor",
    subclass: "deception",
    deck: [54, 54, 54, 54, 54, 54, 55, 55, 1, 1, 4, 4, 30, 30, 42, 42],
    voteStrength: 1,
    defense: 0
  },
  summoner: {
    faction: "neutral",
    subclass: "killing",
    deck: [56, 56, 56, 59, 59, 59, 65, 65, 65, 58, 58, 63, 63, 64, 64, 57],
    voteStrength: 1,
    defense: 1,
  },
  apprentice: {
    faction: "neutral",
    subclass: "evil",
    deck: [60, 60, 60, 61, 61, 61, 65, 65, 65, 20, 20, 56, 56, 57, 58, 64],
    voteStrength: 1,
    defense: 0,
  }
};

var roleGroups = {
  "Guest-Investigative": ["investigator", "sheriff"],
  "Guest-Protective": ["guardian", "doctor"],
  "Guest-Support": ["lawyer"],
  "Guest-Killing": ["vigilante"],
  "Impostor-Killing": ["assassin", "ringleader"],
  "Impostor-Deception": ["prosecutor", "disguiser"],
  "Impostor-Support": ["thug", "silencer"],
  "Neutral-Killing": ["maw", "summoner"],
  "Neutral-Evil": ["trickster", "apprentice"],
  "Neutral-Benign": ["eternal"]
};

var capitalize = function(str) {
  if(!str) {
    return "";
  }
  
  if(str.length === 0) {
    return "";
  }
  
  var first = str[0];
  str = str.split("");
  str.shift();
  return first.toUpperCase() + str.join("").toLowerCase();
};

const arg = {
  exists: function(argNum) {
    return function(message) {
      var content = message.content.split(" ");
      return content[argNum + 1] !== undefined;
    };
  },
  isNum: function(argNum) {
    return function(message) {
      var content = message.content.split(" ");
      return !isNaN(parseInt(content[argNum + 1]));
    };
  },
  isString: function(argNum) {
    return function() {
      if (content[argNum + 1] === undefined) {
        return false;
      }
      var content = message.content.split(" ");
      return isNaN(parseInt(content[argNum + 1]));
    };
  },
  isUnder: function(argNum, compareTo) {
    return function(message) {
      var content = message.content.split(" ");
      if (!isNaN(parseInt(content[argNum + 1]))) {
        return parseInt(content[argNum + 1]) < compareTo;
      }
      return false;
    };
  },
  isUnderEqual: function(argNum, compareTo) {
    return function(message) {
      var content = message.content.split(" ");
      if (content[argNum + 1] === undefined) {
        return false;
      }
      if (!isNaN(parseInt(content[argNum + 1]))) {
        return parseInt(content[argNum + 1]) <= compareTo;
      }
      return false;
    };
  },
  isOver: function(argNum, compareTo) {
    return function(message) {
      var content = message.content.split(" ");
      if (!isNaN(parseInt(content[argNum + 1]))) {
        return parseInt(content[argNum + 1]) > compareTo;
      }
      return false;
    };
  },
  isOverEqual: function(argNum, compareTo) {
    return function(message) {
      var content = message.content.split(" ");
      if (!isNaN(parseInt(content[argNum + 1]))) {
        return parseInt(content[argNum + 1]) >= compareTo;
      }
      return false;
    };
  },
  isNot: function(argNum, compareTo) {
    return function(message) {
      var content = message.content.split(" ");
      if (!isNaN(parseInt(content[argNum + 1]))) {
        return parseInt(content[argNum + 1]) !== compareTo;
      }
      return false;
    };
  },
  playerID: function(argNum) {
    return function(message) {
      var content = message.content.split(" ");
      return Account.findFromID(parseInt(content[argNum + 1])) !== false;
    }
  },
  partyID: function(argNum) {
    return function(message) {
      var content = message.content.split(" ");
      return Party.findFromID(parseInt(content[argNum + 1])) !== false;
    }
  },
  playerID: function(argNum) {
    return function(message) {
      var content = message.content.split(" ");
      return Game.findFromPlayerUserID(message.author.id).playerFromID(parseInt(content[argNum + 1]));
    }
  }
};
const clearance = {
  isOwner: function(message) {
    return message.author.id === "198590928166977537" || message.author.id === "272512190605557761" || message.author.id === "244942825974661120";
  },//Check if the author is owner (Temp or Bren)
  hasPerm: function(perm) {
    return function(message) {
      if(message.channel.type !== "text") {
        return false;
      }
      return message.guild.members.get(message.author.id).hasPermission(perm) || clearance.isOwner(message);
    }
  }
};
const channel = {
  isDM: function(message) {
    return message.channel.type === "dm";
  },
  isNotDM: function(message) {
    return message.channel.type !== "dm";
  },
  isLobby: function(message) {
    return message.channel.id === "329339003268628480";
  }
};
const acc = {
  has: function(message) {
    return Account.findFromUserID(message.author.id);
  },
  none: function(message) {
    return !Account.findFromUserID(message.author.id);
  },
  inParty: function(message) {
    return Party.findFromMemberUserID(message.author.id) !== false;
  },
  noParty: function(message) {
    return Party.findFromMemberUserID(message.author.id) === false;
  },
  isHost: function(message) {
    if(acc.noParty(message)) return false;
    return Party.findFromMemberUserID(message.author.id).members[0] === Account.findFromUserID(message.author.id).ID;
  },
  inGame: function(message) {
    return Game.findFromPlayerUserID(message.author.id) !== false;
  },
  noGame: function(message) {
    return Game.findFromPlayerUserID(message.author.id) === false;
  }
};

var Account = function(data) {
  this.userID = data.userID || 0;
  this.accID = data.accID || 0;
  
  this.gems = data.gems || 0;
  
  this.wins = data.wins || 0;
  this.losses = data.losses || 0;
  
  this.ID = data.ID || 0;
};
Account.findFromUserID = function(id) {
  for(var i = 0; i < accounts.length; i++) {
    if(accounts[i].userID === id) {
      return accounts[i];
    }
  }
  return false;
};
Account.findFromID = function(id) {
  for(var i = 0; i < accounts.length; i++) {
    if(accounts[i].ID === id) {
      return accounts[i];
    }
  }
  return false;
};

Account.prototype.generateID = function() {
  for(var i = 0; i <= accounts.length; i++) {
    if(i === accounts.length) this.ID = i;
    var done = false;
    for(var j = 0; j < accounts.length && !done; j++) {
      if(i === accounts[j].ID) {
        done = true;
      }
    }
    if(!done) {
      this.ID = i;
      return this.ID;
    }
  }
  return this.ID;
};
Account.prototype.getWinrate = function() {
  if(this.wins === 0) return 0;
  return this.wins/(this.wins + this.losses);
};
Account.prototype.getData = function() {
  return {
    userID: this.userID,
    gems: this.gems,
    wins: this.wins,
    losses: this.losses,
    ID: this.ID,
  };
};
Account.prototype.getUser = function() {
  return server.members.get(this.userID);
};

var Player = function(account, id) {
  this.account = account;
  account.player = this;
  
  this.ID = id;
  
  this.role = null;
  this.rolename = null;
  this.readrole = null;
  this.defense = 0;
  this.minimumDefense = 0;
  this.bonusDefense = 0;
  
  this.deck = [];
  this.hand = [];
  
  this.special = {};
  this.silenced = false;
  
  this.vote = 0;
  this.intellect = 5;
  
  this.voteStrength = 1;
  this.intellectModifier = 0;
  
  this.visitors = [];
  this.denied = false;
};
Player.findFromUserID = function(id) {
  return Game.findFromPlayerUserID(id).playerFromUserID(id);
};
Player.findFromID = function(id) {
  return Game.findFromPlayerID(id).playerFromID(id);
};

Player.prototype.assignRole = function(rolename) {
  if(!roles[rolename]) {
    var roleChosen = roleGroups[rolename][Math.floor(Math.random() * roleGroups[rolename].length)];
    this.rolename = roleChosen;
    this.role = roles[roleChosen];
  }
  else {
    this.role = roles[rolename];
    this.rolename = rolename;
  }
  this.readrole = this.rolename;
  
  this.alive = true;
  
  this.vote = null;
  this.voteStrength = this.role.voteStrength;
  
  this.defense = this.role.defense;
  this.deck = this.role.deck.slice();
  this.shuffleDeck();
  this.drawCards(4);
  
  this.priority = this.role.priority;
};
Player.prototype.discardHand = function() {
  for(var i = this.hand.length - 1; i >= 0; i--) {
    this.placeInDeck(this.hand.splice(i, 1)[0]);
  }
  this.send("Discarded your hand!");
};
Player.prototype.drawCards = function(amount, cap) {
  var cardsDrawn = 0;
  if(this.hand.length >= 6 || this.deck.length === 0 || amount === 0) return;
  for(var i = 0; i < amount && this.hand.length < (cap || 6) && this.deck.length !== 0; i++) {
    cardsDrawn++;
    this.hand.push(this.deck.shift());
  }
  this.send("You drew " + (cardsDrawn === 1 ? "a card" : (cardsDrawn + " cards")) + "!");
};
Player.prototype.send = function(message) {
  client.users.get(this.account.userID).send(message);
};
Player.prototype.placeInDeck = function(card) {
  this.deck.splice(Math.floor(Math.random() * this.deck.length), 0, card);
};
Player.prototype.shuffleDeck = function() {
  var shuffled = [];
  while(this.deck.length > 0) {
    shuffled.push(this.deck.splice(Math.floor(Math.random() * this.deck.length), 1)[0]);
  }
  this.deck = shuffled.slice();
};
Player.prototype.endOfDay = function() {
  this.vote = null;
  this.voteStrength = this.role.voteStrength;
  this.drawCards(1);
  this.intellectModifier = 0;
  this.bonusDefense = 0;
  this.minimumDefense = 0;
  this.silenced = false;
  this.readrole = this.rolename;
};
Player.prototype.vote = function(target) {
  this.vote = target;
};
Player.prototype.prediction = function() {
  var otherRolename = null;
  var keys = Object.keys(roles);
  otherRolename = keys[Math.floor(Math.random() * keys.length)];
  while(otherRolename === this.readrole) {
    otherRolename = keys[Math.floor(Math.random() * keys.length)];
  }
  if(Math.random() < 0.5) {
    return [this.readrole, otherRolename];
  }
  return [otherRolename, this.readrole];
};
Player.prototype.minDef = function(minDef) {
  if(this.minimumDefense < minDef) {
    this.minimumDefense = minDef;
  }
};
Player.prototype.getDefense = function() {
  var calcDef = this.defense + this.bonusDefense;
  return Math.max(this.minimumDefense, calcDef);
};
Player.prototype.queueCardUse = function(card, target) {
  Game.findFromPlayerID(this.account.ID).queuedCardUses.push({
    user: this,
    card: card,
    target: target || null
  });
};
Player.prototype.useInstant = function(card) {
  cards[card].effect(this);
};
Player.prototype.attack = function(strength, killer, silent) {
  if(!this.alive) return false;
  if(strength > this.getDefense()) {
    this.alive = false;
    this.send("You have DIED!");
    if(killer) killer.send("Your attack succeeded!");
    if(!silent) {
      Game.findFromPlayerID(this.account.ID).announce("**#" + this.ID + "** has died! They were a **" + this.rolename + "**!");
    }
    else {
      Game.findFromPlayerID(this.account.ID).announce("**#" + this.ID + "** has died! They were killed silently, and their role is hidden!");
    }
    return true;
  }
  else {
    this.send("You were attacked, but survived!");
    if(killer) killer.send("Your target's defense was too high!");
    return false;
  }
};
Player.prototype.refreshHand = function() {
  var cardsDiscarded = 0;
  for(var i = this.hand.length - 1; i >= 0; i--) {
    cardsDiscarded++;
    this.placeInDeck(this.hand.splice(i, 1)[0]);
  }
  this.send("Refreshed hand!");
};
Player.prototype.loseAllIntellect = function() {
  this.intellect = 0;
  this.send("Lost all intellect!");
};
Player.prototype.discardRandom = function(amount) {
  var discarded = 0;
  for(var i = 0; i < amount && this.hand.length > 0; i++) {
    discarded++;
    this.placeInDeck(this.hand.splice(Math.floor(Math.random() * this.hand.length), 1)[0]);
  }
  if(this.hand.length === 0 && discarded !== 0) {
    this.send("Discarded your hand!");
    return;
  }
  if(discarded !== 0) this.send("Randomly discarded " + (discarded === 1 ? " a card!" : discarded + " cards!"));
};
Player.prototype.placeInHand = function(card) {
  if(this.hand.length < 6) {
    this.hand.splice(Math.floor(Math.random() * this.hand.length), 0, card);
  }
};
Player.prototype.shuffle = function() {
  var all = Object.keys(roles);
  this.readrole = all[Math.floor(Math.random() * all.length)]
};

var Party = function(host) {
  this.members = [host];
  this.rolelist = [];
  this.ID = 0;
};
Party.findFromID = function(id) {
  for(var i = 0; i < parties.length; i++) {
    if(parties[i].ID === id) {
      return parties[i];
    }
  }
  return false;
}
Party.findFromMemberID = function(id) {
  for(var i = 0; i < parties.length; i++) {
    for(var j = 0; j < parties[i].members.length; j++) {
      if(parties[i].members[j] === id) {
        return parties[i];
      }
    }
  }
  return false;
};
Party.findFromMemberUserID = function(id) {
  return Party.findFromMemberID(Account.findFromUserID(id).ID);
};

Party.prototype.generateID = function() {
  var i = 0;
  while(true) {
    var done = false;
    for(var j = 0; j < parties.length && !done; j++) {
      if(i === parties[j].ID) {
        done = true;
      }
    }
    if(!done) {
      this.ID = i;
      return this.ID;
    }
    i++;
  }
  return this.ID;
};
Party.prototype.close = function() {
  for(var i = 0; i < parties.length; i++) {
    if(parties[i] === this) {
      parties.splice(i, 1);
      return;
    }
  }
};
Party.prototype.add = function(newPlayer) {
  this.members.push(newPlayer);
};
Party.prototype.remove = function(gonePlayer) {
  for(var i = 0; i < this.members.length; i++) {
    if(this.members[i] === gonePlayer) {
      this.members.splice(i, 1);
      if(this.members.length === 0) {
        this.kill();
        return "dead";
      }
      return "alive";
    }
  }
  return "fail";
};
Party.prototype.merge = function(mergeTo) {
  mergeTo.members = mergeTo.members.concat(this.members);
  this.kill();
};
Party.prototype.kill = function() {
  for(var i = 0; i < parties.length; i++) {
    if(parties[i] === this) {
      parties.splice(i, 1);
      return true;
    }
  }
  return false;
};
Party.prototype.addRoles = function(newRoles) {
  this.rolelist = this.rolelist.concat(newRoles);
};
Party.prototype.removeRoles = function(goneRoles) {
  for(var i = 0; i < goneRoles.length; i++) {
    this.rolelist[goneRoles[i]] = "GONE_FLAG";
  }
  for(var i = this.rolelist.length - 1; i >= 0; i--) {
    if(this.rolelist[i] === "GONE_FLAG") {
      this.rolelist.splice(i, 1);
    }
  }
};
Party.prototype.clearRoles = function() {
  this.rolelist = [];
};

var Game = function(players, rolelist) {
  this.players = players;
  this.rolelist = rolelist;
  
  this.day = 1;
  this.time = 1;
  
  this.queuedCardUses = [];
};
Game.findFromPlayerUserID = function(id) {
  for(var i = 0; i < games.length; i++) {
    for(var j = 0; j < games[i].players.length; j++) {
      if(games[i].players[j].account.userID === id) {
        return games[i];
      }
    }
  }
  return false;
};
Game.findFromPlayerID = function(id) {
  for(var i = 0; i < games.length; i++) {
    for(var j = 0; j < games[i].players.length; j++) {
      if(games[i].players[j].account.ID === id) {
        return games[i];
      }
    }
  }
  return false;
};

Game.prototype.playerFromUserID = function(id) {
  for(var i = 0; i < this.players.length; i++) {
    if(this.players[i].account.userID === id) {
      return this.players[i];
    }
  }
  return false;
};
Game.prototype.playerFromAccountID = function(id) {
  for(var i = 0; i < this.players.length; i++) {
    if(this.players[i].account.ID === id) {
      return this.players[i];
    }
  }
  return false;
}
Game.prototype.playerFromID = function(id) {
  for(var i = 0; i < this.players.length; i++) {
    if(this.players[i].ID === id) {
      return this.players[i];
    }
  }
  return false;
}
Game.prototype.phase = function() {
  if(this.time < 75) {
    return "day";
  }
  else {
    return "night";
  }
};
Game.prototype.livingPlayers = function() {
  var living = [];
  for(var i = 0; i < this.players.length; i++) {
    if(this.players[i].alive) {
      living.push(this.players[i]);
    }
  }
  return living;
};
Game.prototype.votesForPlayer = function(id) {
  var totalVotes = 0;
  for(var i = 0; i < this.players.length; i++) {
    if(this.players[i].vote === id && this.players[i].voteStrength > 0) {
      totalVotes += this.players[i].voteStrength;
    }
  }
  return totalVotes;
};
Game.prototype.livingID = function(id) {
  var valid = this.livingPlayers();
  for(var i = 0; i < this.valid.length; i++) {
    if(valid[i].ID === id) {
      return true;
    }
  }
  return false;
};
Game.prototype.update = function() {
  if(this.time === 75) {
    var living = this.livingPlayers();
    var votesNeeded = Math.floor(living.length/2 + 1);
    
    for(var i = 0; i < living.length; i++) {
      if(this.votesForPlayer(living[i].ID) >= votesNeeded) {
        living[i].attack(10e6);
        this.announce("Player **#" + living[i].ID + "** has accumulated enough votes to be executed for treason against the guests.");
      }
    }
    
    for(var i = 0; i < living.length; i++) {
      living[i].endOfDay();
    }
    
    this.announce("The sun has set - it is now night.");
  }
  if(this.time === 134) {
    var living = this.livingPlayers();
    
    for(var i = 0; i < this.queuedCardUses.length; i++) {
      if(this.queuedCardUses[i].target) {
        this.queuedCardUses[i].target.visitors.push(this.queuedCardUses[i].user);
      }
    }
    
    var priority = 6;
    while(priority > 0) {
      priority--;
      for(var i = 0; i < this.queuedCardUses.length; i++) {
        if(cards[this.queuedCardUses[i].card].priority === priority) {
          cards[this.queuedCardUses[i].card].effect(this.queuedCardUses[i].user, this.queuedCardUses[i].target);
        }
      }
    }
    
    this.queuedCardUses = [];
    
    for(var i = 0; i < living.length; i++) {
      living[i].intellect = 10 + living[i].intellectModifier;
      living[i].intellectModifier = 0;
    }
    for(var i = 0; i < this.players.length; i++) {
      this.players[i].visitors = [];
    }
  }
  if(this.time === 0) {
    var votesNeeded = Math.floor(this.livingPlayers().length/2 + 1);
    
    this.announce("The sun has risen - it is now **day**." + (this.day === 1 ? "" : " Votes required to execute: **" + votesNeeded + "**."));
  }
  this.tick();
  this.checkWin();
};
Game.prototype.tick = function() {
  if(this.time >= 135) {
    this.day++;
    this.time = 0;
  }
  this.time++;
};
Game.prototype.announce = function(msg) {
  for(var i = 0; i < this.players.length; i++) {
    this.players[i].send(msg);
  }
};
Game.prototype.checkWin = function() {
  var living = this.livingPlayers();
  var factionWon = null;
  var willKill = false;
  
  if(living.length === 0) {
    this.announce("The game has concluded! Everyone is dead, it's a tie!");
    willKill = true;
  }
  else if(living.length === 1) {
    switch(living[0].role.faction) {
      case "guest": this.announce("The game has concluded! The **Guests** have won!"); break;
      case "impostor": this.announce("The game has concluded! The **Impostors** have won!"); break;
      default:
        switch(this.living[0].role.subclass) {
          case "benign": case "evil": this.announce("The game has concluded! Only **#" + living[0].ID + "** has won!"); break;
          case "killing": this.announce("The game has concluded! All **" + capitalize(living[0].rolename) + "s** have won!"); break;
        }
    }
    factionWon = living[0].role.faction;
    willKill = true;
  }
  else {
    var fac = living[0].role.faction;
    var cont = true;
    for(var i = 1; i < living.length; i++) {
      if(living[i].role.faction !== fac && living[i].role.subclass !== "benign") {
        cont = false;
      }
      if(fac === "guest") {
        if(living[i].role.subclass === "evil") {
          cont = false;
        }
      }
    }
    if(cont) {
      switch(fac) {
        case "guest": this.announce("The game has concluded! Only Guests and Neutral-Benigns are alive - they win!"); break;
        case "impostor": this.announce("The game has concluded! Only Impostors, Neutral-Benigns, and Neutral-Evils are alive - they win!"); break;
        case "neutral": this.announce("The game has concluded! Only Neutrals remain! All surviving Neutrals win!");
      }
      factionWon = fac;
      willKill = true;
    }
  }
  
  if(willKill) {
    for(var i = 0; i < this.players.length; i++) {
      var gemsGiven = 4 * this.players.length - 8;
      if(this.players[i].alive) {
        gemsGiven = gemsGiven * 1.25;
      }
      if(this.players[i].role.faction === factionWon) {
        if(factionWon !== "neutral") {
          gemsGiven *= 2;
          this.players[i].account.wins++;
        }
        else if(this.players[i].alive) {
          gemsGiven *= 4;
          this.players[i].account.wins++;
        }
        else {
          this.players[i].account.losses++;
        }
      }
      else {
        this.players[i].account.losses++;
      }
      
      if(gemsGiven > 0) {
        this.players[i].send("For this game, you won **" + gemsGiven + "** ðŸ’Ž Gems!");
        this.players[i].account.gems += gemsGiven;
      }
    }
    
    this.kill();
  }
};
Game.prototype.kill = function() {
  var log = "LOG ENTRY:";
  for(var i = this.players.length - 1; i >= 0; i--) {  
    log += "\n" + (this.players.length - i) + ") **#" + this.players[i].account.ID + "** - " + client.users.get(this.players[i].account.userID).username + " - **" + capitalize(this.players[i].rolename) + "** - " + (this.players[i].alive ? "[  ]" : "[x]");
  }
  
  for(var i = 0; i < games.length; i++) {
    if(games[i] === this) {
      games.splice(i, 1);
      return;
    }
  }
};

var clear = function(channel, msgnum) {
  channel.bulkDelete(msgnum, true);
};
var clearAll = function(channel) {
  channel.bulkDelete(100, true).then(function() {
    if(channel.lastMessageID) {
      clearAll(channel);
    }
  });
};

client.on("ready", function() {
  client.user.setGame("try MMPREFIX");
  console.log("Ready!");
});

setInterval(function() {
  for(var i = 0; i < games.length; i++) {
    games[i].update();
  }
}, 1000);

var commands = [
  {//help
    names: ["help"],
    desc: "Get information about commands. Used `.help [tag]`",
    conditions: [],
    effect: function(message, args) {
      if(args[0]) {
        var cmd = [], f = false;
        for(var i = 1; i < commands.length; i++) {
          if(commands[i].tags.indexOf(args[0].toLowerCase()) !== -1) {
            cmd.push(commands[i]);
            f = true;
          }
        }
        if(f) {
          var str = "Command list:\nArguments in (parentheses) are required, arguments in [brackets] are optional.\n";
          for(var i = 0; i < cmd.length; i++) {
            str += "." + cmd[i].names[0] + " - " + cmd[i].desc + "\n";
          }
          str += "Tags: temp, mod, core, setup, info, game, host";
          message.channel.send(str, { split: true });
        }
        else {
          message.channel.send("Invalid tag");
        }
        return;
      }
      var str = "Command list:\nArguments in (parentheses) are required, arguments in [brackets] are optional.\n";
      for(var i = 1; i < commands.length; i++) {
        str += "." + commands[i].names[0] + " - " + commands[i].desc + "\n";
      }
      str += "Tags: temp, mod, core, setup, info, game, host";
      message.channel.send(str, { split: true });
    }
  }, 
  {//exit
    names: ["exit"],
    desc: "Turn off the bot. TemporalFuzz only.",
    tags: ["temp", "setup", "core"],
    conditions: [ { get: clearance.isOwner, message: "This command is only usable by TemporalFuzz!" } ],
    effect: function(message, args) {
      process.exit();
    },
  },
  {//clear
    names: ["clear", "clearmessages", "sweep", "sweepmessages", "deletemessages"],
    desc: "Clear a certain number of messages from the channel. Used `.clear (num)`",
    tags: ["mod"],
    conditions: [
      { get: clearance.hasPerm("MANAGE_MESSAGES"), message: "You must be able to manage messages to use this command!" },
      { get: arg.isNum(0), message: "Invalid message number." }
    ],
    effect: function(message, args) {
      if(parseInt(args[0]) >= 100) {
        message.channel.send("Only 99 messages can be deleted at a time.");
        return;
      }
      clear(message.channel, parseInt(args[0]) + 1);
    }
  },
  {//clearall
    names: ["clearall", "deleteall"],
    desc: "Deletes all messages in a channel, in chunks. Mod only.",
    tags: ["moderator", "setup"],
    conditions: [ { get: clearance.hasPerm("MANAGE_MESSAGES"), message: "You must be able to manage messages to use this command!" } ],
    effect: function(message, args) {
      clearAll(message.channel);
    }
  },
  {//register
    names: ["register"],
    desc: "Make an account!",
    tags: ["account", "setup"],
    conditions: [
      { get: acc.none, message: "You already have an account!" },
    ],
    effect: function(message, args) {
      var yourAccount = new Account( { userID: message.author.id } );
      message.channel.send("Account created! Your generated ID is: **#" + yourAccount.generateID() + "**!");
      accounts.push(yourAccount);
      exportAccountData();
    }
  },
  {//open
    names: ["open"],
    desc: "Opens a party.",
    tags: ["setup", "open"],
    conditions: [
      { get: acc.has, message: "You must have an account to open a party! Use the register command" },
      { get: acc.noParty, message: "Leave your current party to open one." },
      { get: acc.noGame, message: "You can't use this command while in a game." },
    ],
    effect: function(message, args) {
      var yourParty = new Party(Account.findFromUserID(message.author.id).ID);
      message.channel.send("Party opened! Party ID is **#" + yourParty.generateID() + "**!");
      parties.push(yourParty);
    }
  },
  {//join
    names: ["join"],
    desc: "Join a party. Used `.join (ID)`",
    tags: ["setup", "open"],
    conditions: [
      { get: acc.has, message: "You don't have an account! Use the register command" },
      { get: acc.noParty, message: "Leave your current party to join one." },
      { get: acc.noGame, message: "You can't use this command while in a game." },
      { get: arg.exists(0), message: "Invalid Party ID" },
      { get: arg.partyID(0), message: "Invalid Party ID" },
    ],
    effect: function(message, args) {
      var yourParty = Party.findFromID(parseInt(args[0]));
      
      if(yourParty.length >= 12) {
        message.channel.send("You can't join a full party!");
        return;
      }
      
      yourParty.add(Account.findFromUserID(message.author.id).ID);
      message.channel.send("Joined! **" + yourParty.members.length + "** Members (out of 12)");
    }
  },
  {//parties
    names: ["parties"],
    desc: "See all the open parties.",
    tags: ["setup", "open", "info"],
    conditions: [],
    effect: function(message, args) {
      if(parties.length === 0) {
        message.channel.send("No parties open!");
        return;
      }
      var yourResponse = "Parties:";
      for(var i = 0; i < parties.length; i++) {
        yourResponse += "\n" + (i + 1) + ") **#" + parties[i].ID + "** - Hosted by " + client.users.get(Account.findFromID(parties[i].members[0]).userID).username + " - " + parties[i].members.length + " Members";
      }
      message.channel.send(yourResponse);
    }
  },
  {//close
    names: ["close"],
    desc: "Close your party.",
    tags: ["setup", "open", "host"],
    conditions: [
      { get: acc.has, message: "You don't have an account! Use the register command" },
      { get: acc.isHost, message: "You're not the host of a party!" },
    ],
    effect: function(message, args) {
      var yourParty = Party.findFromMemberUserID(message.author.id);
      yourParty.kill();
      message.channel.send("Party closed!");
    }
  },
  {//leave
    names: ["leave"],
    desc: "Leave your party.",
    tags: ["setup", "open"],
    conditions: [
      { get: acc.has, message: "You don't have an account! Use the register command" },
      { get: acc.inParty, message: "You're not in a party." },
    ],
    effect: function(message, args) {
      var yourParty = Party.findFromMemberUserID(message.author.id);
      var yourID = Account.findFromUserID(message.author.id).ID;
      var success = yourParty.remove(yourID);
      switch(success) {
        case "dead": message.channel.send("Left, empty party closed!"); break;
        case "alive": message.channel.send("Left!"); break;
        default: message.channel.send("Something went wrong - the issue has been reported."); console.log(yourID + " -  .leave failure - " + yourParty);
      }
      /*for(var i = 0; i < yourParty.members.length; i++) {
        if(yourParty.members[i] === yourID) {
          yourParty.members.splice(i, 1);
          if(yourParty.members.length === 0) {
            yourParty.close();
            message.channel.send("Left! Empty party closed.");
          }
          else message.channel.send("Left!");
          return;
        }
      }*/
    }
  },
  {//playerlist
    names: ["playerlist", "party", "plist", "game"],
    desc: "See details about your party.",
    tags: ["setup", "open"],
    conditions: [ { get: acc.has, message: "You don't have an account! Use the register command" }, ],
    effect: function(message, args) {
      if(acc.inParty(message)) {
        var yourParty = Party.findFromMemberUserID(message.author.id);
        var yourResponse = "**#" + yourParty.ID + "** - **" + yourParty.members.length + "** Member" + (yourParty.members.length === 1 ? "" : "s") + " (out of 10) - Party Members:";
        
        for(var i = 0; i < yourParty.members.length; i++) {
          yourResponse += "\n" + (i + 1) + ") **#" + yourParty.members[i] + "** - " + client.users.get(Account.findFromID(yourParty.members[i]).userID).username + (i === 0 ? " [HOST]" : "");
        }
        message.channel.send(yourResponse);
      }
      else if(acc.inGame(message)) {
        var yourGame = Game.findFromPlayerUserID(message.author.id);
        var yourResponse = "Game - " + yourGame.players.length + " Players:";
        
        for(var i = 0; i < yourGame.players.length; i++) {
          yourResponse += "\n" + (i + 1) + ") **#" + yourGame.players[i].ID + "**" + (yourGame.players[i].alive ? "" : "[DEAD]");
        }
        message.channel.send(yourResponse);
      }
      else {
        message.channel.send("You're not in a game or party!");
      }
    }
  },
  {//merge
    names: ["merge"],
    desc: "Merge your party with another. Used `.merge (ID)`",
    tags: ["setup", "host", "open"],
    conditions: [
      { get: acc.has, message: "You don't have an account! Use the register command" },
      { get: arg.partyID(0), message: "Invalid Party ID" },
      { get: acc.isHost, message: "You're not the host of a party!" },
    ],
    effect: function(message, args) {
      var yourParty = Party.findFromMemberUserID(message.author.id);
      var thatParty = Party.findFromID(parseInt(args[0]));
      
      if(yourParty.members.length + thatParty.members.length > 12) {
        message.channel.send("If you merge, the new party will have over 12 members!");
        return;
      }
      
      if(yourParty.ID !== parseInt(args[0])) {
        yourParty.merge(thatParty);
        message.channel.send("Merged!");
      }
      else {
        message.channel.send("You can't merge with your own party!");
      }
    }
  },
  {//addrole
    names: ["arole", "addrole", "addroles", "aroles"],
    desc: "Add a role to your party's list. Used `.addrole (ROLE)`",
    tags: ["setup", "host", "open"],
    conditions: [
      { get: acc.has, message: "You don't have an account! Use the register command" },
      { get: acc.isHost, message: "You're not the host of a party!" },
    ],
    effect: function(message, args) {
      var yourParty = Party.findFromMemberUserID(message.author.id);
      var rolesToAdd = [];
      for(var i = 0; i < args.length; i++) {
        var validGroup = false;
        for(var j in roleGroups) {
          if(j.toLowerCase() === args[i].toLowerCase()) {
            validGroup = true;
            rolesToAdd.push(j);
          }
        }
        if(!validGroup) {
          if(args[i].toLowerCase() in roles) {
            rolesToAdd.push(args[i].toLowerCase());
          }
          else {
            message.channel.send("Invalid Rolename: " + args[i] + " - No roles added.");
            return;
          }
        }
      }
      yourParty.addRoles(rolesToAdd);
      message.channel.send("Roles added!");
    }
  },
  {//removeroles
    names: ["rrole", "removerole", "removeroles", "rroles"],
    desc: "Remove a role from your party's list. Used `.removeroles (ROLENUMS)`",
    tags: ["setup", "host", "open"],
    conditions: [
      { get: acc.has, message: "You don't have an account! Use the register command" },
      { get: acc.isHost, message: "You're not the host of a party!" },
    ],
    effect: function(message, args) {
      var yourParty = Party.findFromMemberUserID(message.author.id);
      var rolesToRemove = [];
      for(var i = 0; i < args.length; i++) {
        if(isNaN(parseInt(args[i]))) {
          message.channel.send("Invalid Role ID: " + args[i] + " - No roles removed.");
          return;
        }
        if(parseInt(args[i]) <= yourParty.rolelist.length && parseInt(args[i]) > 0) {
          rolesToRemove.push(parseInt(args[i]) - 1);
        }
        else {
          message.channel.send("Invalid Role ID: " + args[i] + " - No roles removed.");
          return;
        }
      }
      yourParty.removeRoles(rolesToRemove);
      message.channel.send("Roles removed!");
    }
  },
  {//clearroles
    names: ["croles", "clearroles"],
    desc: "Clear your party's role list",
    tags: ["setup", "host", "open"],
    conditions: [
      { get: acc.has, message: "You don't have an account! Use the register command" },
      { get: acc.isHost, message: "You're not the host of a party!" },
    ],
    effect: function(message, args) {
      var yourParty = Party.findFromMemberUserID(message.author.id);
      yourParty.clearRoles();
      message.channel.send("All roles removed!");
    }
  },
  {//rolelist
    names: ["rolelist", "rlist"],
    desc: "View your party's role list",
    tags: ["setup", "open", "info"],
    conditions: [ { get: acc.has, message: "You don't have an account! Use the register command" } ],
    effect: function(message, args) {
      var yourParty = Party.findFromMemberUserID(message.author.id);
      if(!yourParty) {
        var yourGame = Game.findFromPlayerUserID(message.author.id);
        var yourResponse = "**Game Rolelist:**";
        if(!yourGame) {
          message.channel.send("You aren't in a game or party!");
          return;
        }
        for(var i = 0; i < yourGame.rolelist.length; i++) {
          yourResponse += "\n" + (i + 1) + ") " + capitalize(yourGame.rolelist[i]);
        }
        message.channel.send(yourResponse);
        return;
      }
      if(yourParty.rolelist.length === 0) {
        message.channel.send("No roles listed!");
        return;
      }
      var yourResponse = "**#" + yourParty.ID + "** - Roles:";
      for(var i = 0; i < yourParty.rolelist.length; i++) {
        yourResponse += "\n" + (i + 1) + ") " + capitalize(yourParty.rolelist[i]);
      }
      message.channel.send(yourResponse);
    }
  },
  {//start
    names: ["start", "startgame", "sgame"],
    desc: "Start your party's game!",
    tags: ["setup", "host", "open"],
    conditions: [
      { get: acc.has, message: "You don't have an account! Use the register command" },
      { get: acc.isHost, message: "You're not the host of a party." },
      { get: acc.noGame, message: "You can't use this command while in a game." },
    ],
    effect: function(message, args) {
      var yourParty = Party.findFromMemberUserID(message.author.id);
      if(yourParty.rolelist.length !== yourParty.members.length) {
        message.channel.send("The number of roles must be equal to the number of players to start!");
        return;
      }
      
      var players = [], rlist = yourParty.rolelist.slice();;
      
      while(yourParty.members.length > 0) {
        var n = yourParty.members.length;
        players.push(new Player(Account.findFromID(yourParty.members.splice(Math.floor(Math.random() * yourParty.members.length), 1)[0]), n));
      }
      
      while(yourParty.rolelist.length > 0) {
        var n = yourParty.rolelist.length - 1;
        players[n].assignRole(yourParty.rolelist.splice(Math.floor(Math.random() * yourParty.rolelist.length), 1)[0]);
      }
      
      var yourGame = new Game(players, rlist);
      for(var i = 0; i < yourGame.players.length; i++) {
        yourGame.players[i].send("The game has started! You are player **#" + yourGame.players[i].ID + "**, and your role is **" + capitalize(yourGame.players[i].rolename) + "**.");
      }
      games.push(yourGame);
      
      yourParty.kill();
      
      message.channel.send("Party closed, game started!");
    }
  },
  {//say
    names: ["say", "s"],
    desc: "Talk in the game chat! Used `.say (MSG)`",
    tags: ["game", "action"],
    conditions: [
      { get: acc.has, message: "You don't have an account! Use the register command" },
      { get: acc.inGame, message: "You aren't in a game!" },
      { get: channel.isDM, message: "You can only use this command in a DM channel." },
      { get: arg.exists(0), message: "You can't send an empty message!" }
    ],
    effect: function(message, args) {
      var yourGame = Game.findFromPlayerUserID(message.author.id);
      var yourPlayer = yourGame.playerFromUserID(message.author.id);
      if(yourGame.phase() === "night") {
        message.author.send("You can't talk during the night!");
        return;
      }
      if(!yourPlayer.alive) {
        message.author.send("You can't talk while dead!");
        return;
      }
      var msg = args.join(" ");
      if(yourPlayer.silenced) {
        msg = "I am silenced."
      }
      for(var i = 0; i < yourGame.players.length; i++) {
        yourGame.players[i].send("**#" + yourGame.playerFromUserID(message.author.id).ID + "**: " + msg);
      }
    }
  },
  {//hand
    names: ["hand"],
    desc: "View your hand in the game",
    tags: ["game", "info"],
    conditions: [
      { get: acc.has, message: "You don't have an account! Use the register command" },
      { get: acc.inGame, message: "You aren't in a game!" },
      { get: channel.isDM, message: "You can only use this command in a DM channel." },
    ],
    effect: function(message, args) {
      var yourPlayer = Player.findFromUserID(message.author.id);
      var yourResponse = yourPlayer.intellect + " ðŸŽ© - Hand:";
      for(var i = 0; i < yourPlayer.hand.length; i++) {
        var yourCard = cards[yourPlayer.hand[i]];
        yourResponse += "\n**" + (i + 1) + ")** #" + yourPlayer.hand[i] + " - " + capitalize(yourCard.name) + " - " + yourCard.cost + " ðŸŽ© - " + yourCard.desc;
      }
      yourPlayer.send(yourResponse);
    }
  },
  {//play
    names: ["play", "playcard", "target", "p"],
    desc: "Play the a card in your hand. Used `.play (CARD) [TARGET]`",
    tags: ["game", "action"],
    conditions: [
      { get: acc.has, message: "You don't have an account! Use the register command" },
      { get: acc.inGame, message: "You aren't in a game!" },
      { get: channel.isDM, message: "You can only use this command in a DM channel." },
      { get: arg.isNum(0), message: "Invalid card" }
    ],
    effect: function(message, args) {
      var yourPlayer = Player.findFromUserID(message.author.id);
      var yourGame = Game.findFromPlayerUserID(message.author.id);
      
      if(!yourPlayer.alive) {
        message.channel.send("You can't play cards while dead!");
        return;
      }
      
      if(isNaN(parseInt(args[0]))) {
        message.channel.send("Invalid card");
        return;
      }
      
      if(parseInt(args[0]) > yourPlayer.hand.length || parseInt(args[0]) < 1) {
        message.channel.send("Invalid card");
        return;
      }
      
      if(!yourPlayer.hand[parseInt(args[0]) - 1]) {
        message.channel.send("Invalid card");
        return;
      }
      
      if(yourGame.phase() === "day") {
        message.channel.send("You cannot play cards during the day!");
        return;
      }
      if(cards[yourPlayer.hand[parseInt(args[0]) - 1]].cost <= yourPlayer.intellect) {
        if(cards[yourPlayer.hand[parseInt(args[0]) - 1]].instant) {
          yourPlayer.useInstant(yourPlayer.hand[parseInt(args[0]) - 1]);
        }
        if(cards[yourPlayer.hand[parseInt(args[0]) - 1]].targets === 1) {
          if(!args[1]) {
            message.channel.send("Invalid target!");
            return;
          }
          if(isNaN(parseInt(args[1]))) {
            message.channel.send("Invalid target!");
            return;
          }
          if(!yourGame.playerFromID(parseInt(args[1]))) {
            message.channel.send("Invalid target!");
            return;
          }
          if(!cards[yourPlayer.hand[parseInt(args[0]) - 1]].dead && !yourGame.playerFromID(parseInt(args[1])).alive) {
            message.channel.send("This card cannot target the dead!");
            return;
          }
          if(cards[yourPlayer.hand[parseInt(args[0]) - 1]].alive === false && yourGame.playerFromID(parseInt(args[1])).alive) {
            message.channel.send("This card cannot target the living!");
            return;
          }
          if(!cards[yourPlayer.hand[parseInt(args[0]) - 1]].self && yourPlayer.ID === parseInt(args[1])) {
            message.channel.send("This card cannot target its user!");
            return;
          }
          yourPlayer.queueCardUse(yourPlayer.hand[parseInt(args[0]) - 1], yourGame.playerFromID(parseInt(args[1])));
        }
        else {
          yourPlayer.queueCardUse(yourPlayer.hand[parseInt(args[0]) - 1]);
        }
        var oldIntellect = yourPlayer.intellect;
        yourPlayer.intellect -= cards[yourPlayer.hand[parseInt(args[0]) - 1]].cost;
        message.channel.send("Card played! Your ðŸŽ© Intellect went from **" + oldIntellect + "** to **" + yourPlayer.intellect + "**.");
        if(!cards[yourPlayer.hand[parseInt(args[0]) - 1]].destroy) {
          yourPlayer.placeInDeck(yourPlayer.hand.splice(parseInt(args[0]) - 1, 1)[0]);
        }
        else {
          yourPlayer.hand.splice(parseInt(args[0]) - 1, 1);
        }
      }
      else {
        message.channel.send("You don't have enough intellect to play that card!");
      }
    }
  },
  {//vote
    names: ["vote", "v"],
    desc: "Vote for someone in-game. Used `.vote (ID)`",
    tags: ["game", "action"],
    conditions: [
      { get: acc.has, message: "You don't have an account! Use the register command" },
      { get: acc.inGame, message: "You aren't in a game!" },
      { get: channel.isDM, message: "You can only use this command in a DM channel." },
      { get: arg.playerID(0), message: "Invalid vote target" }
    ],
    effect: function(message, args) {
      var yourPlayer = Player.findFromUserID(message.author.id);
      var yourGame = Game.findFromPlayerUserID(message.author.id);
      
      if(!yourPlayer.alive) {
        message.channel.send("You cannot vote while dead!");
        return;
      }
      
      if(yourGame.day === 1) {
        message.channel.send("You cannot vote on day one!");
        return;
      }
      
      if(yourGame.phase() === "night") {
        message.channel.send("You cannot vote during the night!");
        return;
      }
      
      if(yourPlayer.ID === parseInt(args[0])) {
        message.channel.send("Mausoleum Mansion does not condone suicidal inclinations.");
        return;
      }
      
      if(yourPlayer.vote === parseInt(args[0])) {
        yourGame.announce("Someone canceled their vote for **#" + yourPlayer.vote + "**!");
        yourPlayer.vote = null;
        return;
      }
      
      if(yourPlayer.vote !== null) {
        yourGame.announce("Someone has changed their vote from **#" + yourPlayer.vote + "** to **#" + parseInt(args[0]) + "**!");
      }
      else {
        yourGame.announce("Someone has voted for **#" + parseInt(args[0]) + "**");
      }
      
      yourPlayer.vote = parseInt(args[0]);
    }
  },
  {//player
    names: ["player", "gameinfo", "me"],
    desc: "See your in-game summary.",
    tags: ["game", "info"],
    conditions: [
      { get: acc.has, message: "You don't have an account! Use the register command" },
      { get: acc.inGame, message: "You aren't in a game!" },
      { get: channel.isDM, message: "You can only use this command in a DM channel." }
    ],
    effect: function(message, args) {
      var yourPlayer = Player.findFromUserID(message.author.id);
      var str = "**#" + yourPlayer.ID + "** - **" + capitalize(yourPlayer.rolename) + "**";
      if(yourPlayer.role.faction === "impostor") {
        str += "\n\nImpostors:"
        var yourGame = Game.findFromPlayerID(yourPlayer.account.ID);
        for(var i = 0; i < yourGame.players.length; i++) {
          if(yourGame.players[i].role.faction === "impostor") {
            str += "\n**#" + yourGame.players[i].ID + "** - **" + yourGame.players[i].rolename + "**";
          }
        }
      }
      message.channel.send(str);
    }
  },
  {//whisper
    names: ["whisper", "w"],
    desc: "Whisper to someone in the game! Used `.whisper (ID)`",
    tags: ["game", "action"],
    conditions: [
      { get: acc.has, message: "You don't have an account! Use the register command" },
      { get: acc.inGame, message: "You aren't in a game!" },
      { get: arg.exists(0), message: "Invalid whisper target." },
      { get: arg.exists(1), message: "You can't send an empty whisper!" },
      { get: arg.playerID(0), message: "Invalid whisper target." },
      { get: channel.isDM, message: "You can only use this command in a DM channel." }
    ],
    effect: function(message, args) {
      var yourGame = Game.findFromPlayerUserID(message.author.id);
      var yourPlayer = Player.findFromUserID(message.author.id);
      var targetPlayer = yourGame.playerFromID(parseInt(args[0]));
      
      if(yourGame.phase() === "night") {
        message.channel.send("You can't whisper at night!");
        return;
      }
      
      if(yourPlayer.ID === targetPlayer.ID) {
        message.channel.send("You can't whisper to yourself. We've been over this, Narcissus.");
        return;
      }
      
      args.shift();
      
      yourGame.announce("_**#" + yourPlayer.ID + "** is whispering to **#" + targetPlayer.ID + "**!_");
      targetPlayer.send("_**#" + yourPlayer.ID + "**: " + args.join(" ") + "_");
    }
  },
  {//account
    names: ["account", "myaccount", "myinfo", "profile"],
    desc: "View your account.",
    tags: ["account", "info", "setup"],
    conditions: [ { get: acc.has, message: "You don't have an account! Use the register command" } ],
    effect: function(message, args) {
      var yourAccount = Account.findFromUserID(message.author.id);
      message.channel.send("**#" + yourAccount.ID + "** - " + yourAccount.gems + " ðŸ’Ž | " + yourAccount.wins + "W, " + yourAccount.losses + "L | " + yourAccount.getWinrate().toFixed(3) + " W/L");
    }
  },
  {//cardinfo
    names: ["cardinfo", "card", "cinfo"],
    desc: "See the details of a card. Used `.cardinfo (CARD)`",
    tags: ["setup", "info", "open"],
    conditions: [ { get: arg.exists(0), message: "Invalid card." } ],
    effect: function(message, args) {
      var yourCard = null, yourIndex = null;
      if(isNaN(parseInt(args[0]))) {
        for(var i = 0; i < cards.length; i++) {
          if(cards[i].name === args[0].toLowerCase()) {
            yourCard = cards[i];
            yourIndex = i;
          }
        }
      }
      else if(cards[parseInt(args[0])]) {
        yourCard = cards[parseInt(args[0])];
        yourIndex = parseInt(args[0]);
      }
      if(yourCard) {
      message.channel.send("**#" + yourIndex + " " + capitalize(yourCard.name) + "** - " + yourCard.cost + " ðŸŽ© - " + (yourCard.instant ? "Instant" : "Visit") + (yourCard.rare ? " [RARE]" : "") + "\n" + yourCard.desc);
      }
      else {
        message.channel.send("Invalid card.");
      }
    }
  },
  {//wiki
    names: ["wiki","read","github", "guide"],
    desc: "Get a link to the github MM guide",
    tags: ["info"],
    conditions: [],
    effect: function(message, args) {
      var msgs = [
        "Spicy link for ya: ",
        "One link, coming right up: ",
        "Don't click this: ",
        "Warning! Illegal memes: ",
        "See you on the other side: ",
        "I'll be back: ",
        "The more you know: ",
        "The more places you'll go: ",
        "Here be dragons: ",
        "Click this link to tell the NSA your location: ",
        "Your FBI agent sends his love: "
      ];
      message.channel.send(msgs[Math.floor(Math.random() * msgs.length)] + "https://github.com/TemporalFuzz/mausoleum-mansion/wiki");
    }
  },
  {//tip
    names: ["tip","knowledgeme"],
    desc: "Get a random gameplay tip!",
    tags: ["info"],
    conditions: [],
    effect: function(message, args) {
      var msgs = [
        "Mausoleum Mansion help video: www.youtube.com/watch?v=dQw4w9WgXcQ",
        "Try using instants along with visits. Instants provide bonuses that set up other cards well, and a good visit can put this to use. Stock up on instants, use a few, play a visit (or two), and you'll find that your investment was worth it",
        "Try communicating with your teammates while on the Impostor side. Sending a lot of text in a single whisper, along with saying something like 'do not respond to this' can lead to discrete communication without raising too much suspicion.",
        "As a host, add some role groups (like Guest-Investigative instead of Investigator) for some variety. This makes it so there are more possibilities for who is who, and can add new complexity (and fun) to the game's inherent deception.",
        "There are no easter egg commands.",
        "The Assassin, though with less defense than the Ringleader, can be even more deadly. He's good at taking out high value targets.",
        "The Ringleader is good at creating mass casualties and still having Intellect left over. His defense point helps him, but he's vulnerable to interference from Guest-Protective roles.",
        "Have a role to suggest? DM Victorym#2229 to let him know! :)",
        "The Prosecutor, though he may seem weak, is a powerful addition to the Impostors. Able to steal cards and learn targets' defense (setting up for other Impostors' kills), as well as upset the balance of power in terms of the vote, the Prosecutor is one of the best utility Impostsors.",
        "The Lawyer is a very powerful Guest, contrary to what you may believe. He does well in the shadows, stealing cards with Bribe, but not being a priority kill for the Impostors (like the Investigator). When the game reaches its late stages, his 1-2 bonus votes can make a huge difference, and with the anonymity of voting, it's not hard to escape detection long enough to vote out that last Impostor.",
        "The Maw may seem weak because it has a low proportion of killing cards. However, its attacks are among the game's most powerful. Once a high-priority target has identified themselves, drop a Frenzy on them and wipe out their attackers, protectors, and helpers in one fell swoop.",
        "The Trickster is a role devoted to confusion. Primarily focused on countering Guest-Investigatives and stealing cards, it can be powerful if used well.",
        "Though the Sheriff is arguably weaker than the Investigator, it's much harder for the deceptive roles to mislead him.",
        "The Summoner builds up for massive attacks, summoning minions, and throwing them at anything that moves. A subtle fact is that, with the Spawn card (which summons two minions at once), she can have six minions rather than the usual cap of 5.",
        "The Apprentice, like a mini-Summoner, nevertheless has major killing potential. With the extremely powerful 'Sponsors' card, she can build up to huge amounts of vote strength multiple times! If the Apprentice can survive until the late game, she can sweep the enemy out of the game with their own precious tool - the trial.",
        "Neutral-Benign roles are unique. They don't interfere with any factions' win conditions (Guests and Impostors can win with them) - they simply want to survive until the end of the game.",
        "As a Guest-protective, make sure you guard the high-priority Guests! An Investigator eliminated early on can be devastating."
      ];
      message.channel.send(msgs[Math.floor(Math.random() * msgs.length)]);
    }
  },
  {//changeprefix
    names: ["changeprefix", "setprefix", "prefix"],
    desc: "Set the server prefix",
    tags: ["info", "admin"],
    conditions: [ { get: clearance.hasPerm("ADMINISTRATOR"), message: "You must be a server admin to use this command!" } ],
    effect: function(message, args) {
      if(args[0].length < 5) {
        prefixes[message.guild.id] = args[0];
        message.channel.send("Prefix set to " + args[0]);
        exportPrefixData();
        return;
      }
      message.channel.send("Prefix cannot be over 4 characters.");
    }
  },
  {//server
    names: ["server", "support", "invite"],
    desc: "Get a link to MM's official server.",
    tags: ["info"],
    conditions: [],
    effect: function(message, args) {
      message.channel.send("Here's a link to the Mausoleum Mansion server: https://discord.gg/44M34Sx");
    }
  }
  /*{//smokebomb
    names: ["smokebomb", "poof"],
    desc: "POOF!",
    tags: [],
    conditions: [ { get: acc.inGame, message: "You must be in a game to POOF!" } ],
    effect: function(message, args) {
      Game.findFromPlayerUserID(message.author.id).announce("**#" + Player.findFromUserID(message.author.id).ID + "** HAS DISAPPEARED IN A PUFF OF SMOKE!");
    }
  }*/
];

var runCommand = function(command, message) {
  for(var i = 0; i < command.conditions.length; i++) {
    if(!command.conditions[i].get(message)) {
      message.channel.send(command.conditions[i].message);
      return false;
    }
  }
  var args = message.content.split(" ");
  args.shift();
  
  command.effect(message, args);
  return true;
};

var getPrefix = function(chan) {
  if(chan.type !== "text") {
    return ".";
  }
  return prefixes[chan.guild.id] || ".";
};

client.on("message", function(message) {
  if(message.content === "MMPREFIX") {
    message.channel.sendMessage("Your prefix is " + getPrefix(message.channel) + " - use " + getPrefix(message.channel) + "help for more info.");
    return;
  }
  
  if(!message.content.startsWith(getPrefix(message.channel)) || message.author.id === "285317495298981888") {
    return;
  }
  
  var content = message.content.split("");
  for(var i = 0; i < getPrefix(message.channel).length; i++) {
    content.shift();
  }
  content = content.join("").split(" ");
  
  var cmd = content[0];
  content.shift();
  
  for(var i = 0; i < commands.length; i++) {
    for(var j = 0; j < commands[i].names.length; j++) {
      if(commands[i].names[j] === cmd.toLowerCase()) {
        runCommand(commands[i], message);
      }
    }
  }
});

client.login("You're token here");


