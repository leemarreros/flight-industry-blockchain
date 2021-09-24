module.exports = function getRandomAirlineName() {
  let names = [
    "Super",
    "Rocket",
    "Cloud",
    "Atomic",
    "Thriller",
    "Awesome",
    "Mountain",
    "Picturesque",
    "Alligator",
    "Bubble",
    "Stupendous",
    "Comic",
  ];
  let first = names[Math.floor(Math.random() * names.length)];
  let second = names[Math.floor(Math.random() * names.length)];
  while (first == second) {
    second = names[Math.floor(Math.random() * names.length)];
  }
  return `${first} ${second}`;
};
