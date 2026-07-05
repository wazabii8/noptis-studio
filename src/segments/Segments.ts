import { t, type Locale } from "@/i18n/locale";

export const createGidTypes = (locale: Locale) => ({
  TRANSPORT_AUTHORITY: {
    label: t(locale, "transportAuthority", "Transport Authority"),
    prefix: "9010",
    layout: ["PREFIX", "THM", { index: "000000000" }],
  },
  CONTRACTOR: {
    label: t(locale, "contractor", "Contractor"),
    prefix: "9013",
    layout: ["PREFIX", "THM", "CONTRACTOR", { index: "00000" }],
  },
  LINE: {
    label: t(locale, "line", "Line"),
    prefix: "9011",
    layout: ["PREFIX", "THM", "LINE", { index: "00000" }],
  },
  DIRECTION_PT4: {
    label: t(locale, "directionPt4", "Direction of line (0/1)"),
    prefix: "9012",
    layout: ["PREFIX", "THM", "LINE", { index: "10000" }],
  },
  DIRECTION_PT5: {
    label: t(locale, "directionPt5", "Direction of line (1/2)"),
    prefix: "9014",
    layout: ["PREFIX", "THM", "LINE", { index: "10000" }],
  },
  SERVICE_JOURNEY: {
    label: t(locale, "serviceJourney", "Service Journey"),
    prefix: "9015",
    layout: ["PREFIX", "THM", "LINE", "JOURNEY"],
  },
  DEAD_RUN: {
    label: t(locale, "deadRun", "Dead Run"),
    prefix: "9016",
    layout: ["PREFIX", "THM", "CONTRACTOR", "JOURNEY"],
  },
  STOP_AREA: {
    label: t(locale, "stopArea", "Stop Area"),
    prefix: "9021",
    layout: ["PREFIX", "THM", "STOP", { index: "000" }],
  },
  STOP_POINT: {
    label: t(locale, "stopPoint", "Stop Point"),
    prefix: "9022",
    layout: ["PREFIX", "THM", "STOP", "LOCAL_POS"],
  },
  STATION_ENTRANCE_POINT: {
    label: t(locale, "stationEntrancePoint", "Station Entrance Point"),
    prefix: "9023",
    layout: ["PREFIX", "THM", "STOP", "ENTRANCE"],
  },
  JOURNEY_PATTERN_POINT: {
    label: t(locale, "journeyPatternPoint", "Journey Pattern Point"),
    prefix: "9025",
    layout: ["PREFIX", "THM", "NODE"],
  },
  VEHICLE: {
    label: t(locale, "vehicle", "Vehicle"),
    prefix: "9031",
    layout: ["PREFIX", "THM", "CONTRACTOR", "VEHICLE"],
  },
  VIRTUAL_VEHICLE: {
    label: t(locale, "virtualVehicle", "Virtual Vehicle"),
    prefix: "9038",
    layout: ["PREFIX", "VIRTUAL_VEHICLE_NO"],
  },
  BLOCK: {
    label: t(locale, "block", "Block"),
    prefix: "9041",
    layout: ["PREFIX", "THM", "CONTRACTOR", "BLOCK"],
  },
  EMPLOYEE: {
    label: t(locale, "employee", "Employee"),
    prefix: "9051",
    layout: ["PREFIX", "THM", "CONTRACTOR", "EMPLOYEE"],
  },
  DUTY: {
    label: t(locale, "duty", "Duty"),
    prefix: "9061",
    layout: ["PREFIX", "THM", "CONTRACTOR", "DUTY"],
  },
  DEVIATION_CASE: {
    label: t(locale, "deviationCase", "Deviation Case"),
    prefix: "9076",
    layout: ["PREFIX", "THM", { index: "0" }, "CASE"],
  },
  ZONE: {
    label: t(locale, "zone", "Zone"),
    prefix: "9081",
    layout: ["PREFIX", "THM", "ZONE_TYPE", "ZONE_NO"],
  },
  PLACE: {
    label: t(locale, "place", "Place"),
    prefix: "9091",
    layout: ["PREFIX", "THM", { index: "0" }, "PLACE"],
  },
  BRIDGING_DEVICE: {
    label: t(locale, "bridgingDevice", "Bridging Device"),
    prefix: "9095",
    layout: ["PREFIX", "THM", "EQUIP"],
  },
});

export const createSegments = (locale: Locale) => ({
  PREFIX: { length: 4, label: t(locale, "prefix", "Prefix"), description: t(locale, "prefixDesc", "") },
  THM: { length: 3, label: t(locale, "thmNumber", "THM Number"), description: t(locale, "thmNumberDesc", "") },
  CONTRACTOR: { length: 4, label: t(locale, "contractorNumber", "Contractor Number"), description: t(locale, "contractorNumberDesc", "") },
  ZEROS: { length: 4, label: t(locale, "padding", "Padding"), description: t(locale, "paddingDesc", "") },
  LINE: { length: 4, label: t(locale, "lineNumber", "Line Number"), description: t(locale, "lineNumberDesc", "") },
  JOURNEY: { length: 5, label: t(locale, "journeyDeadRun", "Service Journey / Dead Run"), description: t(locale, "journeyDeadRunDesc", "") },
  STOP: { length: 6, label: t(locale, "stopNumber", "Stop Number"), description: t(locale, "stopNumberDesc", "") },
  LOCAL_POS: { length: 3, label: t(locale, "localPositionNumber", "Local Position Number"), description: t(locale, "localPositionNumberDesc", "") },
  ENTRANCE: { length: 3, label: t(locale, "localEntranceNumber", "Local Entrance Number"), description: t(locale, "localEntranceNumberDesc", "") },
  NODE: { length: 9, label: t(locale, "nodeNumber", "Node Number"), description: t(locale, "nodeNumberDesc", "") },
  VEHICLE: { length: 5, label: t(locale, "vehicleNumber", "Vehicle Number"), description: t(locale, "vehicleNumberDesc", "") },
  BLOCK: { length: 5, label: t(locale, "blockNumber", "Block Number"), description: t(locale, "blockNumberDesc", "") },
  DUTY: { length: 5, label: t(locale, "dutyNumber", "Duty Number"), description: t(locale, "dutyNumberDesc", "") },
  EMPLOYEE: { length: 5, label: t(locale, "employeeNumber", "Employee Number"), description: t(locale, "employeeNumberDesc", "") },
  CASE: { length: 8, label: t(locale, "caseNumber", "Case Number"), description: t(locale, "caseNumberDesc", "") },
  ZONE_TYPE: { length: 2, label: t(locale, "zoneType", "Zone Type"), description: t(locale, "zoneTypeDesc", "") },
  ZONE_NO: { length: 7, label: t(locale, "zoneNumber", "Zone Number"), description: t(locale, "zoneNumberDesc", "") },
  PLACE: { length: 8, label: t(locale, "placeNumber", "Place Number"), description: t(locale, "placeNumberDesc", "") },
  EQUIP: { length: 9, label: t(locale, "equipmentNumber", "Equipment Number"), description: t(locale, "equipmentNumberDesc", "") },
  VIRTUAL_VEHICLE_NO: { length: 12, label: t(locale, "virtualVehicleNumber", "Virtual Vehicle Number"), description: t(locale, "virtualVehicleNumberDesc", "") },
});
