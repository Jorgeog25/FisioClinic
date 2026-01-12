module.exports = `
  type Appointment {
    id: ID!
    date: String!
    time: String!
    status: String!
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
