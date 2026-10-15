import { createSlice } from "@reduxjs/toolkit";
const uiSlice = createSlice({ name: "ui", initialState: { sidebarOpen: false, density: "comfortable" }, reducers: {
  setSidebarOpen(state, action) { state.sidebarOpen = action.payload; },
  toggleSidebar(state) { state.sidebarOpen = !state.sidebarOpen; },
  setDensity(state, action) { state.density = action.payload; },
} });
export const { setSidebarOpen, toggleSidebar, setDensity } = uiSlice.actions;
export default uiSlice.reducer;
