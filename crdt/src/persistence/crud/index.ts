/**
 * CRUD Operations Export
 * 모든 CRUD 함수를 한 곳에서 import 가능
 */

// Trip CRUD
export {
  createTrip,
  getTripById,
  updateTripTitle,
  updateTripField,
  deleteTrip,
} from './tripCrud'

// Schedule CRUD
export {
  createSchedule,
  getScheduleById,
  getSchedulesByTripId,
  updateSchedule,
  deleteSchedule,
} from './scheduleCrud'

// Location CRUD
export {
  createLocation,
  getLocationById,
  getLocationByScheduleId,
  updateLocation,
  deleteLocation,
  deleteLocationByScheduleId,
} from './scheduleCrud'

// Budget CRUD
export {
  createBudget,
  getBudgetById,
  getBudgetsByTripId,
  getBudgetsByDate,
  updateBudget,
  deleteBudget,
  deleteBudgetsByTripId,
  deleteBudgetsByDate,
} from './budgetCrud'
