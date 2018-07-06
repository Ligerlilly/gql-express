const express = require('express');
const bodyParser = require('body-parser');
const {
    graphqlExpress,
} = require('apollo-server-express');
const {
    makeExecutableSchema
} = require('graphql-tools');
const Sequelize = require("sequelize")


const sequelize = new Sequelize('postgres://jasonlane@localhost/rust_todos?sslmode=disable');
const TodoList = sequelize.define('todo_list', {
    name: {
        type: Sequelize.STRING
    }
});

const TodoItem = sequelize.define('todo_items', {
    name: {
        type: Sequelize.STRING
    },
    todoListId: {
        type: Sequelize.BIGINT
    }
});

TodoList.hasMany(TodoItem, {
    foreignKey: "todoListId"
})

TodoItem.belongsTo(TodoList, {
    foreignKey: "todoListId"
})

TodoList.sync({
    force: true
}).then(() => {
    // Table created
    return TodoList.create({
        name: 'Test1',
    }).then(() => TodoItem.sync({
        force: true
    }).then(() => {
        // Table created
        return TodoItem.create({
            name: 'maybe',
            todoListId: 1
        });
    }));
});

// The GraphQL schema in string form
const typeDefs = `
  type Query {
    todoLists: [TodoList]
    todoItems: [TodoItem]
  }
  type TodoList {
      id: ID!
      name: String!
      todoItems: [TodoItem]!
   }
  type TodoItem {
      id: ID!
      name: String!
      todoListId: ID!
  }
  type Mutation {
     createTodoList(name: String!): TodoList
     updateTodoList(id: ID!, name: String!): TodoList
     deleteTodoList(id: ID!): [TodoList]
     createTodoItem(name: String!, todoListId: ID!): TodoItem
     updateTodoItem(id: ID!, name: String!, todoListId: ID!): TodoItem!
     deleteTodoItem(id: ID!, todoListId: ID!): [TodoItem]
  }
`;

const getTodoLists = async () => await TodoList.findAll().map(tl => getTodoListItems(tl))

const getTodoListItems = async (tl) => await ({
    id: tl.id,
    name: tl.name,
    todoItems: TodoItem.findAll({
        where: {
            todoListId: tl.id
        }
    })
})

const createTodoList = async (_, {
    name
}) => await TodoList.create({
    name
}).then(tl => getTodoListItems(tl))

const updateTodoList = async (_, {
    id,
    name
}) => await TodoList.update({
    name: name
}, {
    where: {
        id
    }
}).then(() => TodoList.find({
    where: {
        id
    }
})).then(tl => getTodoListItems(tl))

const deleteTodoList = async (_, {
    id
}) => await TodoList.destroy({
    where: {
        id
    }
}).then(() => getTodoLists())

const createTodoItem = async (_, {
    name,
    todoListId
}) => await TodoItem.create({
    name,
    todoListId
})

const updateTodoItem = async (_, {
    id,
    name,
    todoListId,
}) => await TodoItem.update({
    name,
    todoListId
}, {
    where: {
        id,
    }
}).then(() => TodoItem.find({
    where: {
        id
    }
}))

const deleteTodoItem = async (_, {
    id,
    todoListId
}) => await TodoItem.destroy({
    where: {
        id,
    }
}).then(() => TodoItem.findAll({
    where: {
        todoListId
    }
}))



// The resolvers
const resolvers = {
    Query: {
        todoLists: getTodoLists,
        todoItems: () => TodoItem.findAll()
    },
    Mutation: {
        createTodoList,
        updateTodoList,
        deleteTodoList,
        createTodoItem,
        updateTodoItem,
        deleteTodoItem,
    }

};



// Put together a schema
const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
});

// Initialize the app
const app = express();

// The GraphQL endpoint
app.use('/graphql', bodyParser.json(), graphqlExpress({
    schema
}));







// Start the server
app.listen(3000, () => {
    console.log('Go to http://localhost:3000/graphiql to run queries!');
});