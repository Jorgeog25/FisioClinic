module.exports = `
  type Client {
    id: ID!
    firstName: String
    lastName: String
    reason: String
  }
  type Appointment {
    id: ID!
    date: String!
    time: String!
    status: String!
    clientId: Client
  }
  type Order {
    id: ID!
    total: Float!
    status: String!
    createdAt: String!
    appointments: [Appointment!]!
  }

  type Query {
    allOrders(status: String): [Order!]!
  }

  type Mutation {
    payCart: Order!
  }
`;
