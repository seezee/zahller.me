export default {
  currentYear() {
    const today = new Date();
    const year  = today.getFullYear();
    const dash  = `&thinsp;&mdash;&thinsp;`;
    if (year > 2025) {
      return dash + year;
    } else {
      return;
    }
  },
};
