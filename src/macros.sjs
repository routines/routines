macro <~ { 
  rule infix {
    $lhs | $rhs;
  } => {
    $lhs = yield $rhs.get();
  }
}