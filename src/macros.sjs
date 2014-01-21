macro <~ { 
  rule infix {
    $lhs | $rhs;
  } => {
    $lhs = yield $rhs.get();
  }
}


macro ~> {
  rule infix {
    $lhs | $rhs;
  } => {
    $rhs.send($lhs);
  }
}



