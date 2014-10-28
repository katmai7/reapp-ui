var React = require('react');
var Immstruct = require('immstruct');
var ViewList = require('../../components/ui/views/ViewList');
var DrawerView = require('../../components/ui/views/DrawerView');
var BackButton = require('../../components/ui/components/buttons/BackButton');
var Block = require('../../components/ui/components/Block');

require('./Modals.styl');

var Modals = React.createClass({
  render() {
    var views = [
      {
        id: 'one',
        title: [<BackButton />, 'One', <a href="#two">Two</a>],
        content: (
          <Block>
            Example of a deeply nested thing
            <a className="button" href="#two">Button</a>
          </Block>
        ),
      },
      {
        id: 'two',
        title: [<a href="#one">One</a>, 'Two', <a href="#three">Three</a>],
        content: (
          <Block>
            This is the first nested drawer
          </Block>
        )
      },
      {
        id: 'three',
        title: [null, 'Three'],
        content: (
          <Block>
            This is the second deeply nested
          </Block>
        )
      },
      {
        id: 'four',
        title: [null, 'Four'],
        content: (
          <Block>
            Final deeply nested view
          </Block>
        )
      }
    ];

    return (
      <ViewList views={views} />
    );
  }
});

module.exports = Modals;